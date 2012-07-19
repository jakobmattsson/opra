fs = require("fs")
path = require("path")
less = require("less")
module.exports = (hooks) ->
  hooks.compiler =
    from: "less"
    target: "css"
    compile: (filePath, encoding, assetRoot, callback) ->
      fs.readFile filePath, encoding, (err, content) ->
        if err
          callback err
          return
        less.render content,
          paths: [ assetRoot, path.dirname(filePath) ]
        , callback
