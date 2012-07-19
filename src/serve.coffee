url = require 'url'
fs = require 'fs'
path = require 'path'
powerfs = require 'powerfs'
_ = require 'underscore'

_.mixin(require('underscore.string').exports())

exports.serveConstructor = (dependencies) ->
  return (rootpath, settings) ->
    settings = settings || {}

    settings.assetRoot = rootpath if _.isUndefined(settings.assetRoot)

    return (req, res, next) ->
      pathname = url.parse(req.url).pathname
      filepath = path.join(rootpath, pathname)

      existsSync = fs.existsSync || path.existsSync # Compatible with node 0.6 and 0.8

      if !existsSync(filepath)
        next()
        return

      powerfs.isDirectory filepath, (err, isDirectory) ->
        if err
          dependencies.log("OPRA ERROR (while searching for " + filepath + ")", err)
          next()
          return

        if isDirectory
          pathname = path.join(pathname, 'index.html')
          filepath = path.join(filepath, 'index.html')

        if !_.endsWith(pathname, '.html')
          next()
          return

        dependencies.build filepath, settings, (err, result) ->
          if err
            dependencies.log("OPRA ERROR while compiling " + pathname, err)
            next()
            return

          res.setHeader('Content-Type', 'text/html')
          res.setHeader('Content-Length', Buffer.byteLength(result))
          res.end(result)
