var path = require('path');
var fs = require('fs');
var glob = require('glob');
var should = require('should');
var sugar = require('sugar');
var mkdirp = require('mkdirp');
var wrench = require('wrench');
var async = require('async');
var opra = require('../src/opra.js');

global.test = function(desc, mocks, args, output, del) {
  del = del || [];
  var assetRoot = args.assetRoot || __dirname;

  it(desc, function(done) {
    async.forEach(Object.keys(mocks), function(f, callback) {
      var p = path.join(f && f[0] == '/' ? assetRoot : __dirname, f);
      mkdirp(path.dirname(p), function(err) {
        if (err) console.log("ERR", err);
        fs.writeFile(p, mocks[f], 'utf8', callback);
      });
    }, function(err) {
      if (err) console.log("ERR", err);
      var complete = function(callback) {
        async.forEach(Object.keys(mocks), function(f, callback) {
          fs.unlink(path.join(f && f[0] == '/' ? assetRoot : __dirname, f), callback);
        }, function(err) {
          if (err) console.log("ERR", err);
          async.forEach(del.map(function(d) {
            return path.join(d && d[0] == '/' ? assetRoot : __dirname, d);
          }), function(toDelete, callback) {
            fs.stat(toDelete, function(err, stat) {
              if (err) {
                callback(err);
              } else if (stat.isFile()) {
                fs.unlink(toDelete, callback);
              } else {
                wrench.rmdirSyncRecursive(toDelete);
                callback();
              }
            });
          }, callback);
        });
      };

      opra.build(path.join(__dirname, 'index.html'), args, function(err, res) {
        var called = false;
        try {
          should.ifError(err);
          res.should.equal(output);
        } catch (ex) {
          called = true;
          complete(function() {
            throw ex;
          });
        }
        if (!called) {
          complete(done);
        }
      });
    });
  });
};
