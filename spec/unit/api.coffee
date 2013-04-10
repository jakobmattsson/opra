should = require 'should'
jscov = require 'jscov'
opra = require(jscov.cover('../..', 'lib', 'opra.js'))


it "should expose 'build', 'serve', 'server', 'export' and 'extend'; nothing else", ->
  opra.should.have.keys('build', 'serve', 'server', 'extend', 'export')
