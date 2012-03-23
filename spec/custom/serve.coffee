should = require 'should'
serve = require "../../#{process.env.SRC_DIR || 'src'}/serve.js"

it "should expose 'serveConstructor'; nothing else", ->
  serve.should.have.keys('serveConstructor')

it "should log an error and then move on if the given file could not be found", (done) ->
  logged = []

  serveFunc = serve.serveConstructor
    log: (msg) -> logged.push(arguments)

  connectFunc = serveFunc('path')

  connectFunc({
    url: 'someurl.html'
  }, { }, () ->
    logged.length.should.equal(1)
    logged[0].length.should.equal(2)
    logged[0][0].should.equal("OPRA ERROR (while searching for path/someurl.html)")
    logged[0][1].toString().should.include('no such file')
    done()
  )



  # 
  # 
  # it "should ", (done) ->
  #   logged = []
  # 
  #   serveFunc = serve.serveConstructor
  #     build: (file, settings, callback) ->
  #       #settings.should.have.keys('assetRoot')
  #       #settings.assetRoot.should.equal('path')
  #       console.log("no file")
  #       callback('No such file')
  #     log: (msg) -> console.log("logged"); logged.push(arguments)
  # 
  #   connectFunc = serveFunc('path', {})
  # 
  #   connectFunc({
  #     url: 'someurl.html'
  #   }, { }, () ->
  #     console.log logged
  #     logged.should.equal(['No such file'])
  #     done()
  #   )
  # 
