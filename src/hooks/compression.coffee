_ = require 'underscore'
cleanCSS = require 'clean-css'
uglify = require 'uglify-js'

minimifyJS = (code) ->
  if uglify.minify
    uglify.minify(code || '', { fromString: true }).code
  else
    uglify(code || '', { fromString: true })


module.exports = (hooks) ->
  hooks.file = (tag) ->
    compressor =
      css: (code, callback) -> cleanCSS.process code
      js: (code, callback) -> minimifyJS(code)

    return tag if !tag.content? || !_(tag.file.params).contains('compress') || !compressor[tag.file.type]?

    return {
      file: tag.file
      content: compressor[tag.file.type](tag.content)
    }
