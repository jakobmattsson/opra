fs = require 'fs'
coffee = require 'coffee-script'
helpers = require '../helpers'

propagate = helpers.propagate

module.exports = (hooks) ->
  hooks.compiler =
    from: 'coffee'
    target: 'js'
    compile: (filePath, encoding, assetRoot, callback) ->
      fs.readFile filePath, encoding, propagate callback, (content) ->
        code = null

        try
          code = coffee.compile(content)
        catch e
          callback(e)
          return
        callback(null, code)
