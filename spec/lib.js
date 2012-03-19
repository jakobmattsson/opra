var path = require('path');
var fs = require('fs');
var glob = require('glob');
var should = require('should');
var sugar = require('sugar');
var mkdirp = require('mkdirp');
var wrench = require('wrench');
var async = require('async');
var evil = require('evil').pollute(global);

var opra = require('../src/opra.js');

var isPathAbsolute = function(filename) {
  return path.resolve(filename) === filename;
};

global.test = function(desc, mocks, args, output, del) {
  del = del || {};
  var assetRoot = args.assetRoot || __dirname;

  it(desc, function(done) {
    async.forEach(Object.keys(mocks), function(f, callback) {
      var p = path.join(f && f[0] == '/' ? assetRoot : __dirname, f);
      mkdirp(path.dirname(p), propagate(callback, function() {
        fs.writeFile(p, mocks[f], 'utf8', callback);
      }));
    }, function(err) {
      should.ifError(err);

      var complete = function(callback) {
        async.forEach(Object.keys(mocks), function(f, callback) {
          fs.unlink(path.join(isPathAbsolute(f) ? assetRoot : __dirname, f), callback);
        }, propagate(callback, function() {
          async.forEach(Object.keys(del), function(d, callback) {
            var toDelete = path.join(isPathAbsolute(d) ? assetRoot : __dirname, d);
            fs.stat(toDelete, propagate(callback, function(stat) {
              if (stat.isFile()) {
                fs.readFile(toDelete, 'utf8', propagate(callback, function(content) {
                  fs.unlink(toDelete, propagate(callback, function() {
                    if (content !== del[d]) {
                      content.should.equal(del[d]);
                    }
                    callback();
                  }));
                }));
              } else {
                if (del[toDelete]) {
                  callback("expecting content, but was directory");
                  return;
                }
                wrench.rmdirSyncRecursive(toDelete);
                callback();
              }
            }));
          }, callback);
        }));
      }.once();

      opra.build(path.join(__dirname, 'index.html'), args, function(err, res) {
        try {
          should.ifError(err);
          res.should.equal(output);
        } catch (ex) {
          complete(function(err) {
            if (err) {
              throw err;
            }
            throw ex;
          });
        }
        complete(done);
      });
    });
  });
};
