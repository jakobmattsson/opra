fs = require("fs")
path = require("path")
less = require("less")
_ = require("underscore")
module.exports = (hooks) ->
  hooks.tagCreator = (file, content, callback) ->
    if file.type is "css"
      if _.isUndefined(content)
        callback null,
          name: "link"
          attributes:
            rel: "stylesheet"
            type: "text/css"
            href: file.name

          content: null
      else
        callback null,
          name: "style"
          attributes:
            type: "text/css"

          content: content
    else
      callback()

  hooks.compiler =
    from: "css"
    target: "css"
    compile: (filePath, encoding, assetRoot, callback) ->
      fs.readFile filePath, encoding, callback
