fs = require 'fs'
path = require 'path'
async = require 'async'
glob = require 'glob'
_ = require 'underscore'
_s = require 'underscore.string'
helpers = require './helpers.js'

propagate = helpers.propagate

_.mixin(require('underscore.string').exports())

resolveIndexFileDir = exports.resolveIndexFileDir = (filename) ->
  path.resolve(process.cwd(), path.dirname(filename))

filePathToAbsolute = exports.filePathToAbsolute = (filename, assetRoot, indexFileDir) ->
  basePath = if helpers.isPathAbsolute(filename) then assetRoot else indexFileDir
  if helpers.isPathAbsolute(filename) then '/' + path.relative(basePath, filename) else filename

getMatches = exports.getMatches = (content, prefix, postfix) ->
  reg = new RegExp(" *" + prefix + "( +[^\n]*)?\n([^>]*)" + postfix, "g")

  m1 = helpers.execAll(reg, content).map (x) ->
    str: x[0]
    params: _.compact((x[1] || '').split(' '))

  return m1.map (matchData) ->
    filename = undefined

    filenames = matchData.params.filter (p) -> _s.contains(p, '.')
    matchData.params = matchData.params.filter (p) -> !_s.contains(p, '.')
    filename = filenames[0] if filenames.length >= 1

    return {
      match: matchData.str
      filename: filename
      spaces: matchData.str.match(/^\s*/)[0]
      params: matchData.params
      files: matchData.str.replace(prefix, "").replace(postfix, "").split('\n').slice(1).map (s) ->
        s.split('#')[0]
      .filter (s) ->
        s.trim()
      .map (s) ->
        d2 = s.split(' ').map (p) -> p.trim()
        data = _.compact(d2)
        return {
          name: data[0]
          params: data.slice(1)
          spaces: s.match(/^\s*/)[0] || ''
        }
    }


globMatches = exports.globMatches = (assetRoot, indexFileDir, matches, callback) ->
  async.map matches, (match, callback) ->
    async.mapSeries match.files, (file, callback) ->
      globber file.name, assetRoot, indexFileDir, propagate callback, (globbedFiles) ->
        console.error("Found no matches for pattern: " + file.name) if !globbedFiles

        callback null, _.extend({}, file, {
          globs: globbedFiles.map (globbedFile) ->
            filePathToAbsolute(globbedFile, assetRoot, indexFileDir).replace(new RegExp('\\\\', 'g'), "/")
        })

    , propagate callback, (result) ->
      callback null, _.extend({}, match, { files: result })
  , callback


globber = exports.globber = (pattern, root, cwd, callback) ->
  glob(pattern, { nonull: false, root: root, cwd: cwd }, callback)

flagMatches = exports.flagMatches = (matches, globalFlags) ->

  prec = (params, indirect, n, scope) ->
    if (_.contains(params, 'always-' + n) && _.contains(params, 'never-' + n))
      throw new Error('"always" and "never" assigned to the same ' + scope)
    else if (_.contains(params, 'always-' + n))
      return n
    else if (_.contains(params, 'never-' + n))
      return undefined
    else if (_.contains(indirect, 'always-' + n))
      return n
    else if (_.contains(indirect, 'never-' + n))
      return undefined
    else if (!_.isUndefined(globalFlags) && !_.isUndefined(globalFlags[n]))
      return if globalFlags[n] then n else undefined
    else if (_.contains(params, n) || _.contains(indirect, n))
      return n
    return undefined

  subprec = (files, indirect, prefixes) ->
    return (files || []).map (file) ->
      return _.extend({}, file, {
        params: _.compact(fileParams.map((n) ->
          prec(file.params || [], indirect || [], n, 'file')
        )).concat((file.params || []).filter((x) ->
          filePrefixes.some((fp) ->
            _.startsWith(x, fp + ':')
          )
        ))
      })

  blockParams = ['concat'].sort()
  fileParams = ['compress', 'datauris', 'paths', 'ids', 'escape', 'screen', 'ie7', 'print', 'npm', 'module', 'inline'].sort()
  filePrefixes = ['as']

  matches.map (m) -> _.extend({}, m, {
    params: _.compact(blockParams.map((n) ->
      prec(m.params || [], [], n, 'block')
    ))
    files: subprec(m.files, m.params, filePrefixes)
  })


parseFile = exports.parseFile = (assetRoot, globalFlags, indexFile, indexFileDir, encoding, callback) ->
  fs.readFile indexFile, encoding, propagate callback, (content) ->
    autoNumber = 0

    apa = (res) ->
      # This should be part of the concattenation hook
      res.matches.forEach (match) ->
        if _.contains(match.params, 'concat') && !match.filename
          autoNumber++
          match.filename = '__opra-concat-' + autoNumber
          match.type = null

      res.matches.forEach (match) ->
        match.files.forEach (file) ->
          file.absolutePath = exports.filePathToAbsolute(file.name, assetRoot, indexFileDir)
          file.encoding = encoding
          file.globs = file.globs.map (x) -> {
            name: x
            params: file.params
            spaces: file.spaces
            absolutePath: exports.filePathToAbsolute(x, assetRoot, indexFileDir)
            encoding: encoding
          }

        match.absolutePath = path.join(assetRoot, match.filename) if match.filename

      callback(null, res)

    globMatches assetRoot, resolveIndexFileDir(indexFile), getMatches(content, "<!--OPRA", "-->"), propagate callback, (matches) ->
      apa({
        matches: flagMatches(matches, globalFlags)
        content: content
      })



exports.filePathToAbsolute = (filename, assetRoot, indexFileDir) ->
  p = if helpers.isPathAbsolute(filename) then assetRoot else indexFileDir
  path.join(p, filename)
