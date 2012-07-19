fs = require 'fs'
coffee = require 'coffee-script'

module.exports = (hooks) ->
  hooks.compiler =
    from: 'coffee'
    target: 'js'
    compile: (filePath, encoding, assetRoot, callback) ->
      fs.readFile filePath, encoding, (err, content) ->
        code = null

        return callback(err) if err

        try
          code = coffee.compile(content)
        catch e
          callback(e)
          return
        callback(null, code)
