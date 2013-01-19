fs = require("fs")
path = require("path")
less = require("less")
helpers = require '../helpers'

propagate = helpers.propagate

module.exports = (hooks) ->
  hooks.compiler =
    from: "less"
    target: "css"
    compile: (filePath, encoding, assetRoot, callback) ->
      fs.readFile filePath, encoding, propagate callback, (content) ->
        less.render content,
          paths: [ assetRoot, path.dirname(filePath) ]
        , callback
