should = require 'should'
jscov = require 'jscov'
opra = require(jscov.cover('../..', 'lib', 'opra.js'))


it "should expose 'build' and 'serve' and 'extend'; nothing else", ->
  opra.should.have.keys('build', 'serve', 'extend')
