should = require 'should'
opra = require "../../#{process.env.SRC_DIR || 'src'}/opra.js"

it "should expose 'build' and 'serve'; nothing else", ->
  opra.should.have.keys('build', 'serve')
