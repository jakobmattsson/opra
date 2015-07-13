var _ = require('underscore');
var path = require('path');
var fs = require('fs');
var glob = require('glob');
var should = require('should');
// var sugar = require('sugar');
var powerfs = require('powerfs');
var async = require('async');
var jscov = require('jscov');
var opra = require(jscov.cover('..', 'lib', 'opra.js'));

var propagate = function(callback, f) {
  return function(err) {
    if (err) {
      callback(err);
      return;
    }
    return f.apply(this, Array.prototype.slice.call(arguments, 1));
  };
};

global.test = function(desc, mocks, args, output, del) {
  del = del || {};
  var assetRoot = args.assetRoot || __dirname;

  it(desc, function(done) {
    async.forEach(Object.keys(mocks), function(f, callback) {
      var p = path.join(powerfs.isPathAbsolute(f) ? assetRoot : __dirname, f);
      powerfs.writeFile(p, mocks[f], 'utf8', callback);
    }, function(err) {
      should.ifError(err);

      var complete = _.once(function(callback) {
        async.forEach(Object.keys(mocks), function(f, callback) {
          fs.unlink(path.join(powerfs.isPathAbsolute(f) ? assetRoot : __dirname, f), callback);
        }, propagate(callback, function() {
          async.forEach(Object.keys(del), function(d, callback) {
            var toDelete = path.join(powerfs.isPathAbsolute(d) ? assetRoot : __dirname, d);
            powerfs.isFile(toDelete, propagate(callback, function(isFile) {
              if (isFile) {
                fs.readFile(toDelete, 'utf8', propagate(callback, function(content) {
                  fs.unlink(toDelete, propagate(callback, function() {
                    var match = del[d];

                    if (match.contains) {
                      match.contains.forEach(function(text) {
                        content.should.containEql(text);
                      });
                    } else {
                      if (Array.isArray(del[d])) {
                        if (del[d].indexOf(content) == -1) {
                          content.should.eql(del[d][0]);
                        }
                      } else {
                        if (content !== del[d]) {
                          content.should.eql(del[d]);
                        }
                      }
                    }

                    callback();
                  }));
                }));
              } else {
                if (del[toDelete]) {
                  callback("expecting content, but was directory");
                  return;
                }
                powerfs.rmdir(toDelete, callback);
              }
            }));
          }, callback);
        }));
      });

      opra.build(path.join(__dirname, 'index.html'), args, function(err, res) {

        var testOutput = function(outputInstance) {
          if (typeof outputInstance == 'string') {
            should.ifError(err);
            res.should.eql(outputInstance);
          } else {

            if (typeof err == 'object') {
              var obj = _.object(_.pairs(err).filter(function(p) {
                var key = p[0];
                var value = p[1];
                return typeof value != 'undefined';
              }));
              outputInstance.error.should.eql(obj);
            } else {
              outputInstance.error.should.eql(err);
            }
          }
        };

        try {
          if (Array.isArray(output)) {

            var passCount = output.filter(function(x) {
              try {
                testOutput(x);
                return true;
              } catch (ex) {
                return false;
              }
            });

            if (passCount == 0) {
              // none passed.. rerun the first one in order to create a prettier error message
              testOutput(output[0]);
            }

          } else {
            testOutput(output);
          }
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

global.error = function(msg) {
  return { error: msg };
};

global.containsText = function() {
  return { contains: Array.prototype.slice.call(arguments) };
};
