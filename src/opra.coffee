serve = require './serve'
build = require './build'

b = build.buildConstructor({ })

exports.build = b.build
exports.serve = serve.serveConstructor
  build: b.build
  log: console.log.bind(console)

exports.extend = b.extend

exports.extend require '../src/hooks/javascript'
exports.extend require '../src/hooks/css'
exports.extend require '../src/hooks/inlining'
exports.extend require '../src/hooks/npm'
exports.extend require '../src/hooks/compression'
exports.extend require '../src/hooks/conditionalExplorer'
exports.extend require '../src/hooks/concatenation'
exports.extend require '../src/hooks/mediaTypes'
exports.extend require '../src/hooks/tagId'
exports.extend require '../src/hooks/dataPath'
exports.extend require '../src/hooks/datauris'
exports.extend require '../src/hooks/less'
exports.extend require '../src/hooks/coffee-script'
