fs = require 'fs'
path = require 'path'
async = require 'async'
wrench = require 'wrench'
powerfs = require 'powerfs'

propagate = (onErr, onSucc) ->
  (err, rest...) ->
    return onErr(err) if err?
    return onSucc(rest...)

exports.exportConstructor = ({ opraBuild }) ->
  ({ targetDir, sourceDir, extraFiles, opraFiles }, callback) ->

    wrench.rmdirSyncRecursive(targetDir, true)

    list = Object.keys(opraFiles).map (fileName) ->
      (callback) ->
        powerfs.mkdirp path.resolve(targetDir, path.dirname(fileName)), propagate callback, ->
          opraBuild path.resolve(sourceDir, fileName), opraFiles[fileName], propagate callback, (output) ->
            fs.writeFile(path.resolve(targetDir, fileName), output, callback)

    async.parallel list, propagate callback, ->
      extraFiles.forEach (e) ->
        source = path.resolve(sourceDir, e)
        target = path.resolve(targetDir, e)
        if fs.statSync(source).isDirectory()
          wrench.copyDirSyncRecursive(source, target)
        else
          fs.writeFileSync(target, fs.readFile(source))
      callback()
