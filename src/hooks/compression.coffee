_ = require 'underscore'
cleanCSS = require 'clean-css'
uglify = require 'uglify-js'

module.exports = (hooks) ->
  hooks.file = (tag) ->
    compressor =
      css: (code, callback) -> cleanCSS.process code
      js: (code, callback) -> uglify code || ''

    return tag if !tag.content? || !_(tag.file.params).contains('compress') || !compressor[tag.file.type]?

    return {
      file: tag.file
      content: compressor[tag.file.type](tag.content)
    }
