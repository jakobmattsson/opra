fs = require 'fs'
should = require 'should'
powerfs = require 'powerfs'
assert = require 'assert'
build = require('../setup.js').requireSource('build.js')



describe 'build.filetype', ->

  it 'should find the filetype from the suffix and the compiler', () ->
    build.filetype('test.foo', {
      foo: { target: 'bar' }
    }).should.equal('bar')

  it 'should "other" if no none is found', () ->
    build.filetype('test.foo', {
      bar: { target: 'bar' }
    }).should.equal('other')



describe 'build.whichIE', ->

  it 'should find ie7', () ->
    build.whichIE(['a', 'b', 'ie7']).should.equal('ie7')

  it 'should not return if anything if no IEs', () ->
    assert(build.whichIE(['a', 'b', 'c']) == undefined)



describe 'build.wrappIE', ->

  it 'should wrapp ie7', () ->
    build.wrappIE(['a', 'ie7'], 'foobar').should.equal("<!--[if IE 7]>foobar<![endif]-->")

  it 'should return the original string if no IEs', () ->
    build.wrappIE(['a', 'b'], 'foobar').should.equal("foobar")



describe 'build.paramsToMediaType', ->

  it 'should find screen', () ->
    build.paramsToMediaType(['a', 'screen', 'b']).should.equal('screen')

  it 'should find print', () ->
    build.paramsToMediaType(['a', 'b', 'print']).should.equal('print')

  it 'should prefer screen over print', () ->
    build.paramsToMediaType(['screen', 'b', 'print']).should.equal('screen')
    build.paramsToMediaType(['print', 'b', 'screen']).should.equal('screen')

  it 'should not return if anything if no media types', () ->
    assert(build.paramsToMediaType(['a', 'b', 'c']) == undefined)




describe 'build.getMatches', ->

  it 'should parse input data for filenames, spaces, params and files', () ->
    res = build.getMatches """
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

