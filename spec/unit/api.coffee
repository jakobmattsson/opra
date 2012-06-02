should = require 'should'
opra = require('../setup.js').requireSource('opra.js')

it "should expose 'build' and 'serve' and 'extend'; nothing else", ->
  opra.should.have.keys('build', 'serve', 'extend')
