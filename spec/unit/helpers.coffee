fs = require 'fs'
should = require 'should'
helpers = require('../setup.js').requireSource('helpers.js')



it "should expose the expected helpers", ->
  helpers.should.have.keys [
    'compileCoffee'
    'compileLess'
    'safeReplace'
    'safeReplaceAll'
    'execAll'
    'createTag'
    'isPathAbsolute'
    'escapeInlineScript'
  ]



describe 'helpers.compileCoffee', ->

  it 'should compile coffeescript from a file', (done) ->
    fs.writeFile 'test.coffee', 'x = 2', 'utf8', () ->
      helpers.compileCoffee 'test.coffee', 'utf8', (err, code) ->
        should.ifError(err)
        code.should.include('var x;')
        fs.unlink 'test.coffee', done

  it 'should fail if the coffeescript is invalid', (done) ->
    fs.writeFile 'test.coffee', '=====', 'utf8', () ->
      helpers.compileCoffee 'test.coffee', 'utf8', (err, code) ->
        err.toString().should.include('Parse error')
        fs.unlink 'test.coffee', done

  it 'should fail if the file does not exist', (done) ->
    helpers.compileCoffee 'nonexisting.coffee', 'utf8', (err, code) ->
      err.toString().should.include('no such file')
      done()



describe 'helpers.compileLess', ->

  it 'should compile less from a file', (done) ->
    fs.writeFile 'test.less', '@test: #ff0000; a { color: @test; }', 'utf8', () ->
      helpers.compileLess 'test.less', [], 'utf8', (err, code) ->
        should.ifError(err)
        code.should.include('color: #ff0000')
        fs.unlink 'test.less', done

  it 'should fail if the coffeescript is invalid', (done) ->
    fs.writeFile 'test.less', '=====', 'utf8', () ->
      helpers.compileLess 'test.less', [], 'utf8', (err, code) ->
        err.type.should.equal('Parse')
        fs.unlink 'test.less', done

  it 'should fail if the file does not exist', (done) ->
    helpers.compileLess 'nonexisting.less', [], 'utf8', (err, code) ->
      err.toString().should.include('no such file')
      done()



describe 'helpers.safeReplace', ->

  it 'should replace the first occurance of the string', ->
    helpers.safeReplace('abrakadabra', 'abra', '...').should.equal('...kadabra')

  it 'should return the original string if the substring does not exist', ->
    helpers.safeReplace('abrakadabra', 'banana', '...').should.equal('abrakadabra')



describe 'helpers.safeReplaceAll', ->

  it 'should replace all occurance of the string', ->
    helpers.safeReplaceAll('abrakadabra', 'abra', '...').should.equal('...kad...')

  it 'should return the original string if the substring does not exist', ->
    helpers.safeReplaceAll('abrakadabra', 'banana', '...').should.equal('abrakadabra')



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
    helpers.createTag('a', { href: '#', id: 'test' }, 'Text').should.equal('<a href="#" id="test">Text</a>')

  it 'should be able to create tags without content', ->
    helpers.createTag('a', { href: '#', id: 'test' }).should.equal('<a href="#" id="test" />')

  it 'should default to no attributes', ->
    helpers.createTag('a').should.equal('<a />')

  it 'should be possible to create content without attributes', ->
    helpers.createTag('a', 'content').should.equal('<a>content</a>')



describe 'helpers.isPathAbsolute', ->

  it 'should check for initial slashes', ->
    helpers.isPathAbsolute('/test').should.be.true
    helpers.isPathAbsolute('bin').should.be.false



describe 'helpers.escapeInlineScript', ->

  it 'should replace tag-opening with escape sequence', ->
    helpers.escapeInlineScript('script <script></script> script').should.equal('script <script>\\x3C/script> script')

  it 'should return strings without inline scripts as-is', ->
    helpers.escapeInlineScript('script').should.equal('script')
