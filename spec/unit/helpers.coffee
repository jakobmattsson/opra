fs = require 'fs'
should = require 'should'
helpers = require('../setup.js').requireSource('helpers.js')



it "should expose the expected helpers", ->
  helpers.should.have.keys [
    'safeReplace'
    'safeReplaceAll'
    'execAll'
    'createTag'
    'firstNonNullSeries'
    'isPathAbsolute'
    'getValueForFirstKeyMatching'
    'allEqual'
  ]




describe 'helpers.safeReplace', ->

  it 'should replace the first occurance of the string', ->
    helpers.safeReplace('abrakadabra', 'abra', '...').should.eql('...kadabra')

  it 'should return the original string if the substring does not exist', ->
    helpers.safeReplace('abrakadabra', 'banana', '...').should.eql('abrakadabra')



describe 'helpers.safeReplaceAll', ->

  it 'should replace all occurance of the string', ->
    helpers.safeReplaceAll('abrakadabra', 'abra', '...').should.eql('...kad...')

  it 'should return the original string if the substring does not exist', ->
    helpers.safeReplaceAll('abrakadabra', 'banana', '...').should.eql('abrakadabra')



describe 'helpers.execAll', ->

  it 'should return all match objects for the regexp', ->
    x = [['days', 'd'], ['later', 'l']]
    x[0].index = 3
    x[0].input = '28 days later'
    x[1].index = 8
    x[1].input = '28 days later'
    helpers.execAll(/([a-z])[a-z]+/g, '28 days later').should.eql(x)

  it 'should return an empty list if there are no matches', ->
    helpers.execAll(/([a-z])[a-z]+/g, '1337').should.eql([])



describe 'helpers.createTag', ->

  it 'should create a proper html tag', ->
    helpers.createTag({ name: 'a', attributes: { href: '#', id: 'test' }, content: 'Text'}).should.eql('<a href="#" id="test">Text</a>')

  it 'should be able to create tags without content', ->
    helpers.createTag({ name: 'a', attributes: { href: '#', id: 'test' }}).should.eql('<a href="#" id="test" />')

  it 'should default to no attributes', ->
    helpers.createTag({ name: 'a' }).should.eql('<a />')

  it 'should be possible to create content without attributes', ->
    helpers.createTag({ name: 'a', content: 'content'}).should.eql('<a>content</a>')



describe 'helpers.isPathAbsolute', ->

  it 'should check for initial slashes', ->
    helpers.isPathAbsolute('/test').should.be.true
    helpers.isPathAbsolute('bin').should.be.false
