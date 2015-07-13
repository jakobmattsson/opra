fs = require 'fs'
coffee = try require 'coffee-script'
helpers = require '../helpers'

coffee.register()

propagate = helpers.propagate

module.exports = (hooks) ->

  return if !coffee

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
