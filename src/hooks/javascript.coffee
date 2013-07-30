fs = require("fs")
path = require("path")
_ = require("underscore")
module.exports = (hooks) ->
  hooks.tagCreator = (file, content, callback) ->
    if file.type is "js"
      if _.isUndefined(content)
        callback null,
          name: "script"
          attributes:
            type: "text/javascript"
            src: file.name

          content: ""
      else
        callback null,
          name: "script"
          attributes:
            type: "text/javascript"

          content: content
    else
      callback()

  hooks.compiler =
    from: "js"
    target: "js"
    compile: (filePath, encoding, assetRoot, callback) ->
      fs.readFile filePath, encoding, callback
