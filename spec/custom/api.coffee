should = require 'should'
opra = require '../../src/opra.js'

it "should expose 'build' and 'serve'; nothing else", ->
  opra.should.have.keys('build', 'serve')
