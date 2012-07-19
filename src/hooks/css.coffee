fs = require 'fs'
path = require 'path'
less = require 'less'
_ = require 'underscore'

module.exports = (hooks) ->
  hooks.tagCreator = (file, content, callback) ->
    if file.type != 'css'
      callback()
    else
      if content?
        callback null,
          name: 'style'
          content: content
          attributes:
            type: 'text/css'
      else
        callback null,
          name: 'link'
          content: null
          attributes:
            rel: 'stylesheet'
            type: 'text/css'
            href: file.name

  hooks.compiler =
    from: 'css'
    target: 'css'
    compile: (filePath, encoding, assetRoot, callback) ->
      fs.readFile filePath, encoding, callback
