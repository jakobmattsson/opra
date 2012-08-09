fs = require 'fs'
should = require 'should'
powerfs = require 'powerfs'
serve = require('../setup.js').requireSource('serve.js')


dontCall = () -> throw "dont call"



it "should expose 'serveConstructor'; nothing else", ->
  serve.should.have.keys('serveConstructor')



it "should log an error and then move on if the given file could not be found", (done) ->
  logged = []

  serveFunc = serve.serveConstructor
    log: dontCall
    build: dontCall

  connectFunc = serveFunc('path')

  connectFunc {
    url: '/someurl.html'
  }, { }, () ->
    done()



it "should call next without reporting errors if the given file is not an html-file", (done) ->
  serveFunc = serve.serveConstructor
    log: dontCall
    build: dontCall

  connectFunc = serveFunc('path')

  powerfs.writeFile 'path/someurl.css', 'a { color: red }', 'utf8', () ->
    connectFunc {
      url: '/someurl.css'
    }, { }, () ->
      powerfs.rmdir('path', done)



it "should serve html files after calling build", (done) ->
  serveFunc = serve.serveConstructor
    log: dontCall
    build: (file, settings, callback) -> callback(null, "content")

  connectFunc = serveFunc('some/path')

  powerfs.writeFile 'some/path/test.html', '<html></html>', 'utf8', () ->

    result = { header: {} }

    connectFunc {
      url: '/test.html'
    }, {
      setHeader: (name, value) ->
        result.header[name] = value
      end: (data) ->
        result.header['Content-Type'].should.eql('text/html')
        result.header['Content-Length'].should.eql(7)
        data.should.eql("content")
        powerfs.rmdir('some', done)
    }, dontCall



it "should serve the index.html-file if a directory is requested", (done) ->
  serveFunc = serve.serveConstructor
    log: dontCall
    build: (file, settings, callback) -> callback(null, "content")

  connectFunc = serveFunc('some/path')

  powerfs.writeFile 'some/path/index.html', '<html></html>', 'utf8', () ->

    result = { header: {} }

    connectFunc {
      url: '/'
    }, {
      setHeader: (name, value) ->
        result.header[name] = value
      end: (data) ->
        result.header['Content-Type'].should.eql('text/html')
        result.header['Content-Length'].should.eql(7)
        data.should.eql("content")
        powerfs.rmdir('some', done)
    }, dontCall



it "should report and error and call next if build fails", (done) ->
  logged = []

  serveFunc = serve.serveConstructor
    log: (msg) -> logged = logged.concat(Array.prototype.slice.call(arguments))
    build: (file, settings, callback) -> callback("an exception")

  connectFunc = serveFunc('path')

  powerfs.writeFile 'path/index.html', '<html></html>', 'utf8', () ->

    result = { header: {} }

    connectFunc {
      url: '/index.html'
    }, { }, () ->
      logged.length.should.eql(2)
      logged[0].should.eql("OPRA ERROR while compiling /index.html")
      logged[1].toString().should.eql('an exception')
      powerfs.rmdir('path', done)
