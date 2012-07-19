_ = require("underscore")
cleanCSS = require("clean-css")
uglify = require("uglify-js")
module.exports = (hooks) ->
  hooks.file = (tag) ->
    compressor =
      css: (code, callback) ->
        cleanCSS.process code

      js: (code, callback) ->
        uglify code or ""

    return tag  if _.isUndefined(tag.content)
    c = ->
      if _.contains(tag.file.params, "compress")
        if tag.file.type == "css"
          return compressor.css(tag.content)
        else
          return compressor.js(tag.content or "")  if tag.file.type is "js"
      tag.content

    file: tag.file
    content: c()
