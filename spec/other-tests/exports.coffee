fs = require 'fs'
path = require 'path'
wrench = require 'wrench'
should = require 'should'
jscov = require 'jscov'
powerfs = require 'powerfs'
opra = require jscov.cover('../..', 'lib', 'opra.js')

describe 'something', ->

  it "whatever", (done) ->
    source = path.resolve(__dirname, '../scaffolds/pack1')
    outdir = path.resolve(__dirname, '../../tmp/pack1-out')

    wrench.rmdirSyncRecursive(path.resolve(source, '.code'), true)
    wrench.rmdirSyncRecursive(outdir, true)

    powerfs.mkdirp outdir, ->

      opra.export {
        targetDir: outdir
        sourceDir: source
        extraFiles: ['extras', '.code', 'bots']
        opraFiles: {
          'index.html': {}
        }
      }, (err) ->
        should.not.exist err
        fs.existsSync(path.resolve(outdir, 'index.html')).should.eql true
        fs.existsSync(path.resolve(outdir, 'bots')).should.eql true
        fs.existsSync(path.resolve(outdir, 'extras/crap.txt')).should.eql true
        fs.readdirSync(path.resolve(outdir, '.code')).should.have.length 3
        done()
