fs = require 'fs'
path = require 'path'
async = require 'async'
wrench = require 'wrench'
powerfs = require 'powerfs'
_ = require 'underscore'

propagate = (onErr, onSucc) ->
  (err, rest...) ->
    return onErr(err) if err?
    return onSucc(rest...)

exports.exportConstructor = ({ opraBuild }) ->
  ({ targetDir, root, extraFiles, opraFiles }, callback) ->

    wrench.rmdirSyncRecursive(targetDir, true)

    list = Object.keys(opraFiles).map (fileName) ->
      (callback) ->
        powerfs.mkdirp path.resolve(targetDir, path.dirname(fileName)), propagate callback, ->
          opraBuild path.resolve(root, fileName), _.extend({ assetRoot: root }, opraFiles[fileName]), propagate callback, (output) ->
            fs.writeFile(path.resolve(targetDir, fileName), output, callback)

    async.parallel list, propagate callback, ->
      async.forEach extraFiles, (e, callback) ->
        source = path.resolve(root, e)
        target = path.resolve(targetDir, e)
        powerfs.mkdirp path.dirname(target), ->
          if fs.statSync(source).isDirectory()
            wrench.copyDirSyncRecursive(source, target)
          else
            fs.writeFileSync(target, fs.readFileSync(source))
          callback()
      , callback
