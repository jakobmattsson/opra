fs = require 'fs'
path = require 'path'

async = require 'async'
_ = require 'underscore'
powerfs = require 'powerfs'

helpers = require './helpers'
parse = require './parse'

propagate = (callback, func) ->
  (err) ->
    if err
      callback err
      return
    func.apply this, Array::slice.call(arguments, 1)

reduceArray = (seeds, reducers, transform) ->
  seeds.map (seed) ->
    reducers.reduce transform, seed

fileSaver = (files, defaultEncoding, callback) ->
  async.forEach files or [], ((file, callback) ->
    powerfs.writeFile file.name, file.content, file.encoding or defaultEncoding, callback
  ), callback

resolveFileDir = (filename) ->
  path.resolve process.cwd(), path.dirname(filename)

defaultExpand = (f, as, index, callback) ->
  callback null, f

defaultFetcher = (file, opraBlock, fetchFileData, callback) ->
  gfiles = file.globs.map((x) ->
    _.extend {}, x,
      params: file.params
      spaces: file.spaces
  )
  async.mapSeries gfiles, ((gfile, callback) ->
    fetchFileData gfile, opraBlock, callback
  ), callback

defaultSomething = (data, opraBlock, concatable, callback) ->
  callback null,
    tags: data

defaultTagCreator = (file, content, callback) ->
  if _.isUndefined(content)
    callback()
  else
    callback null,
      name: "script"
      attributes:
        type: "text/x-opra"

      content: content

defaultCompiler = ->
  from: `undefined`
  to: `undefined`
  compile: (filename, encoding, assetRoot, callback) ->
    fs.readFile filename, encoding, callback

exports.buildConstructor = (dependencies) ->
  hooks = {}
  hooks.tag = []
  hooks.tag.push (file, tag) ->
    spaces = file.spaces.slice(2)
    if tag.content and (not _.contains(file.params, "compress") or file.type is "other")
      tag.content = tag.content.trim().split("\n").map((s) ->
        file.spaces + s
      ).join("\n")
      tag.content = "\n" + tag.content + "\n" + spaces
    tag

  addTypes = (res) ->
    filetype = (filename) ->
      fts = hooks.compiler.reduce((memo, compiler) ->
        memo[compiler.from] = compiler.target
        memo
      , {})
      Object.keys(fts).reduce ((memo, from) ->
        (if _.endsWith(filename, "." + from) then fts[from] else memo)
      ), "other"

    res.map (match) ->
      _.extend {}, match,
        type: filetype(match.filename)
        files: match.files.map((file) ->
          _.extend {}, file,
            type: filetype(file.name)
            globs: file.globs.map((x) ->
              _.extend {}, x,
                type: filetype(x.name)
            )
        )

  tagify = (tags, callback) ->
    tagCreators = (hooks.tagCreator or []).concat([ defaultTagCreator ])
    async.map tags, ((intag, callback) ->
      helpers.firstNonNullSeries tagCreators, ((hook, callback) ->
        hook intag.file, intag.content, callback
      ), propagate(callback, (tag) ->
        if _.isUndefined(tag)
          callback null, ""
          return
        tag = hooks.tag.reduce((acc, hook) ->
          hook intag.file, acc
        , tag)
        tag = helpers.createTag(tag)
        tag = hooks.postTag.reduce((acc, hook) ->
          hook intag.file, acc
        , tag)
        tag = (if tag then intag.file.spaces.slice(2) + tag else "")
        callback null, tag
      )
    ), propagate(callback, (res) ->
      callback null, res.filter((x) ->
        x
      ).join("\n")
    )

  extend: (f) ->
    h = {}
    f h
    Object.keys(h).forEach (key) ->
      hooks[key] = hooks[key] or []
      if _.isArray(h[key])
        hooks[key] = hooks[key].concat(h[key])
      else
        hooks[key].push h[key]

  build: (indexFile, settings, callback) ->
    if not callback and typeof settings is "function"
      callback = settings
      settings = {}
    settings = settings or {}
    indexFileDir = resolveFileDir(indexFile)
    encoding = settings.encoding or "utf8"
    assetRoot = path.resolve(settings.assetRoot or indexFileDir)
    globalFlags =
      concat: settings.concat
      inline: settings.inline
      compress: settings.compress
      paths: settings.paths
      escape: settings.escape
      ids: settings.ids

    expandFilters = hooks.expand.concat([ defaultExpand ])
    extendedFetchers = hooks.fileFetcher.concat([ defaultFetcher ])
    extendedDataHooks = hooks.data.concat([ defaultSomething ])
    extendedCompilers = hooks.compiler.concat([ defaultCompiler() ])
    getData = (file, opraBlock, callback) ->
      anyTrue = hooks.preventContent.some((hook) ->
        hook file, opraBlock
      )
      unless anyTrue
        callback null,
          file: file
          content: `undefined`

        return
      helpers.firstNonNullSeries extendedCompilers, ((compiler, callback) ->
        if _.isUndefined(compiler.from) or _.endsWith(file.name, "." + compiler.from)
          compiler.compile file.absolutePath, file.encoding, assetRoot, callback
        else
          callback()
      ), propagate(callback, (data) ->
        callback null,
          file: file
          content: data
      )

    parse.parseFile assetRoot, globalFlags, indexFile, indexFileDir, encoding, propagate(callback, (parseResult) ->
      async.reduce addTypes(parseResult.matches),
        cont: parseResult.content
        files: []
      , ((cc, d, callback) ->
        async.map d.files, ((file, callback) ->
          async.map expandFilters, ((hook, callback) ->
            hook file, assetRoot, indexFile, callback
          ), propagate(callback, (suggestions) ->
            callback null, _.first(_.compact(suggestions))
          )
        ), propagate(callback, (expandedFiles) ->
          async.reduce hooks.preproc, _.flatten(expandedFiles), ((acc, hook, callback) ->
            hook acc,
              assetRoot: assetRoot
              indexFile: indexFile
            , callback
          ), propagate(callback, (outs) ->
            async.mapSeries outs, ((file, callback) ->
              helpers.firstNonNullSeries extendedFetchers, ((hook, callback) ->
                hook file, d, getData, callback
              ), callback
            ), propagate(callback, (data) ->
              d2 = reduceArray(_.flatten(data), hooks.file, (acc, hook) ->
                hook acc
              )
              helpers.firstNonNullSeries extendedDataHooks, ((hook, callback) ->
                hook d2, d, hooks.concatable, callback
              ), propagate(callback, (out) ->
                tagify out.tags, propagate(callback, (data) ->
                  callback null,
                    cont: helpers.safeReplace(cc.cont, d.match, data)
                    files: cc.files.concat(out.outfiles or [])
                )
              )
            )
          )
        )
      ), propagate(callback, (r) ->
        fileSaver r.files, encoding, propagate(callback, ->
          callback null, r.cont
        )
      )
    )
