fs = require 'fs'
should = require 'should'
powerfs = require 'powerfs'
assert = require 'assert'
build = require('../setup.js').requireSource('build.js')
parse = require('../setup.js').requireSource('parse.js')



describe 'build.compileCoffee', ->

  it 'should compile coffeescript from a file', (done) ->
    fs.writeFile 'test.coffee', 'x = 2', 'utf8', () ->
      build.getCompiler().coffee.compile 'test.coffee', 'utf8', [], (err, code) ->
        should.ifError(err)
        code.should.include('var x;')
        fs.unlink 'test.coffee', done

  it 'should fail if the coffeescript is invalid', (done) ->
    fs.writeFile 'test.coffee', '=====', 'utf8', () ->
      build.getCompiler().coffee.compile 'test.coffee', 'utf8', [], (err, code) ->
        err.toString().should.include('Parse error')
        fs.unlink 'test.coffee', done

  it 'should fail if the file does not exist', (done) ->
    build.getCompiler().coffee.compile 'nonexisting.coffee', 'utf8', [], (err, code) ->
      err.toString().should.include('ENOENT')
      done()



describe 'build.compileLess', ->

  it 'should compile less from a file', (done) ->
    fs.writeFile 'test.less', '@test: #ff0000; a { color: @test; }', 'utf8', () ->
      build.getCompiler().less.compile 'test.less', 'utf8', [], (err, code) ->
        should.ifError(err)
        code.should.include('color: #ff0000')
        fs.unlink 'test.less', done

  it 'should fail if the coffeescript is invalid', (done) ->
    fs.writeFile 'test.less', '=====', 'utf8', () ->
      build.getCompiler().less.compile 'test.less', 'utf8', [], (err, code) ->
        err.type.should.equal('Parse')
        fs.unlink 'test.less', done

  it 'should fail if the file does not exist', (done) ->
    build.getCompiler().less.compile 'nonexisting.less', 'utf8', [], (err, code) ->
      err.toString().should.include('ENOENT')
      done()



describe 'parse.getMatches', ->

  it 'should parse input data for filenames, spaces, params and files', () ->
    res = parse.getMatches """
      <html>
        <!--apa a b   c

          x.js d e   f
          /y.css file.ext i j k
          /z.foobar l m data.something n
        -->
        test
        <!--apa banan
        -->

      </html>
    """, '<!--apa', '-->'

    res.should.eql([{
      match: '  <!--apa a b   c\n\n    x.js d e   f\n    /y.css file.ext i j k\n    /z.foobar l m data.something n\n  -->'
      filename: undefined
      spaces: '  '
      params: ['a', 'b', 'c']
      files: [{
        name: 'x.js'
        params: ['d', 'e', 'f']
        spaces: '    '
      }, {
        name: '/y.css'
        params: ['file.ext', 'i', 'j', 'k']
        spaces: '    '
      }, {
        name: '/z.foobar'
        params: ['l', 'm', 'data.something', 'n']
        spaces: '    '
      }]
    }, {
      match: '  <!--apa banan\n  -->'
      filename: undefined
      spaces: '  '
      params: ['banan']
      files: []
    }])



describe 'parse.flagMatches', ->

  it 'should default to no global object and no files and no params', ->
    parse.flagMatches([{
      foo: 'bar'
      params: ['concat']
    }, {
      foo: 'bar'
      files: [{
        foo: 'bar'
      }]
    }]).should.eql [{
      foo: 'bar'
      params: ['concat']
      files: []
    }, {
      foo: 'bar'
      params: []
      files: [{
        foo: 'bar'
        params: []
      }]
    }]

  it 'should filter params', ->
    parse.flagMatches([{
      unknown: 'x',
      params: ['a', 'b', 'c', 'concat']
      files: [{
        foo: 'y',
        params: ['escape', 'y', 'screen', 'x']
      }]
    }, {
      bar: 'x',
      params: ['a', 'concat-wrong']
      files: []
    }], {}).should.eql [{
      unknown: 'x',
      params: ['concat']
      files: [{
        foo: 'y',
        params: ['escape', 'screen']
      }]
    }, {
      bar: 'x',
      params: []
      files: []
    }]

  it 'should let global params take precedence', ->
    parse.flagMatches([{
      params: []
      files: [{
        params: ['screen', 'escape']
      }]
    }], {
      concat: true,
      screen: false
    }).should.eql([{
      params: ['concat']
      files: [{
        params: ['escape']
      }]
    }])

  it 'should translate always-params and never-params', ->
    parse.flagMatches([{
      params: ['concat', 'never-concat']
      files: [{
        params: ['always-escape', 'screen', 'never-screen']
      }]
    }]).should.eql([{
      params: []
      files: [{
        params: ['escape']
      }]
    }])

  it 'should let always- and never-params take precedence over global params', ->
    parse.flagMatches([{
      params: ['never-concat']
      files: [{
        params: ['always-screen', 'escape']
      }]
    }], {
      concat: true,
      screen: false
    }).should.eql([{
      params: []
      files: [{
        params: ['escape', 'screen']
      }]
    }])

  it 'should throw if a parameter is specified as both always and never for a block', ->
    wrapper = () ->
      parse.flagMatches([{
        params: ['always-concat', 'never-concat']
      }])
    wrapper.should.throw('"always" and "never" assigned to the same block')

  it 'should throw if a parameter is specified as both always and never for a file', ->
    wrapper = () ->
      parse.flagMatches([{
        files: [{
          params: ['always-compress', 'never-compress']
        }]
      }])
    wrapper.should.throw('"always" and "never" assigned to the same file')

  it 'should allow a certain set of params for files and one for blocks', ->
    parse.flagMatches([{
      params: ['concat', 'a']
      files: [{
        params: ['compress', 'datauris', 'paths', 'ids', 'escape', 'screen', 'ie7', 'print', 'npm', 'a', 'inline', 'module']
      }]
    }]).should.eql([{
      params: ['concat']
      files: [{
        params: ['compress', 'datauris', 'escape', 'ids', 'ie7', 'inline', 'module', 'npm', 'paths', 'print', 'screen']
      }]
    }])

  it 'should propagate file-level params assigned to blocks', ->
    parse.flagMatches([{
      params: ['compress', 'paths']
      files: [{
        params: ['print']
      }, {

      }]
    }]).should.eql([{
      params: []
      files: [{
        params: ['compress', 'paths', 'print']
      }, {
        params: ['compress', 'paths']
      }]
    }])

  it 'should propagate file-level params assigned to blocks, except when the file has a never-param', ->
    parse.flagMatches([{
      params: ['compress', 'paths']
      files: [{
        params: ['print', 'never-compress']
      }, {

      }]
    }]).should.eql([{
      params: []
      files: [{
        params: ['paths', 'print']
      }, {
        params: ['compress', 'paths']
      }]
    }])

  it 'should propagate file-level always-params assigned to blocks', ->
    parse.flagMatches([{
      params: ['always-compress', 'paths']
      files: [{
        params: ['print']
      }, {

      }]
    }], {
      compress: false
    }).should.eql([{
      params: []
      files: [{
        params: ['compress', 'paths', 'print']
      }, {
        params: ['compress', 'paths']
      }]
    }])

  it 'should propagate block-level never-params assigned to blocks', ->
    parse.flagMatches([{
      params: ['never-compress', 'paths']
      files: [{
        params: ['print']
      }, {

      }]
    }], {
      compress: true
    }).should.eql([{
      params: []
      files: [{
        params: ['paths', 'print']
      }, {
        params: ['paths']
      }]
    }])

  it 'should allow any string prefixed with "as:" on file level', ->
    parse.flagMatches([{
      params: []
      files: [{
        params: ['as:jQuery', 'as:_']
      }]
    }]).should.eql([{
      params: []
      files: [{
        params: ['as:jQuery', 'as:_']
      }]
    }])

