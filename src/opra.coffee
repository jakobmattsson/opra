serve = require './serve'
build = require './build'

b = build.buildConstructor({ })

exports.build = b.build
exports.serve = serve.serveConstructor
  build: b.build
  log: console.log.bind(console)

exports.extend = b.extend

exports.extend require './hooks/javascript'
exports.extend require './hooks/css'
exports.extend require './hooks/inlining'
exports.extend require './hooks/npm'
exports.extend require './hooks/compression'
exports.extend require './hooks/conditionalExplorer'
exports.extend require './hooks/concatenation'
exports.extend require './hooks/mediaTypes'
exports.extend require './hooks/tagId'
exports.extend require './hooks/dataPath'
exports.extend require './hooks/datauris'
exports.extend require './hooks/less'
exports.extend require './hooks/coffee-script'
