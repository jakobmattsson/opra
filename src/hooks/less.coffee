fs = require("fs")
path = require("path")
less = try require("less")

helpers = require '../helpers'

propagate = helpers.propagate

module.exports = (hooks) ->

  return if !less

  hooks.compiler =
    from: "less"
    target: "css"
    compile: (filePath, encoding, assetRoot, callback) ->
      fs.readFile filePath, encoding, propagate callback, (content) ->
        try
          less.render content,
            paths: [ assetRoot, path.dirname(filePath) ]
          , callback
        catch ex
          callback(ex)
