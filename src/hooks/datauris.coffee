fs = require 'fs'
path = require 'path'
async = require 'async'
powerfs = require 'powerfs'
_ = require 'underscore'
helpers = require '../helpers'

dataUrl = (filename, callback) ->
  fs.readFile filename, (err, data) ->
    if err
      callback err
      return

    mimes =
      png:  'image/png'
      jpeg: 'image/jpeg'
      jpg:  'image/jpg'
      gif:  'image/gif'
      woff: 'application/x-font-woff'

    format = path.extname(filename).slice(1)
    enc = data.toString("base64")
    console.log "Warning: Very long encoded string; IE (and possibly other browsers) wont like this!"  if enc.length >= Math.pow(2, 15)
    callback null, "url(data:" + mimes[format] + ";base64," + enc + ")"

module.exports = (hooks) ->
  hooks.preproc = (files, meta, callback) ->
    assetRoot = meta.assetRoot
    globs = _.flatten(_.pluck(files, "globs"))
    async.forEachSeries globs, ((item, callback) ->
      unless _.contains(item.params, "datauris")
        callback()
        return
      newName = "/" + path.join(".opra-cache", path.relative(assetRoot, item.absolutePath))
      r2 = path.join(assetRoot, newName)
      haveReplaced = false
      fs.readFile item.absolutePath, item.encoding, (err, data) ->
        if err
          callback err
          return
        exp = "url\\(\\s*['\"]?([^\\)'\"]*)\\.(png|jpeg|jpg|gif|woff)['\"]?\\s*\\)"
        matches = data.match(new RegExp(exp, "g")) or []
        async.forEachSeries matches, ((match, callback) ->
          filename = match.match(exp).slice(1).join(".")
          absolutePath = path.join(path.dirname(item.absolutePath), filename)
          dataUrl absolutePath, (err, encoded) ->
            if err
              callback err
              return
            haveReplaced = true
            data = helpers.safeReplace(data, match, encoded)
            callback()
        ), (err) ->
          powerfs.writeFile r2, data, item.encoding, (err) ->
            if haveReplaced
              item.absolutePath = r2
              item.name = newName
            callback()
    ), (err) ->
      callback err, files
