var fs = require('fs');
glob = require('glob');
var should = require('should');
var sugar = require('sugar');
var opra = require('../opra.js');

var block = function(f) {
  return f();
};

block(function() {
  var _sync = glob.sync;
  glob.sync = function(name) {
    if (name.match(/specfiles/)) {
      return _sync.apply(this, arguments);
    } else {
      return [name];
    }
  };
});

var mockReadFile = block(function() {
  var original = fs.readFile;
  return function(replacements) {
    fs.readFile = function(name) {
      var args = Array.prototype.slice.call(arguments, 0);
      if (replacements[name]) {
        args.last()(null, replacements[name]);
      } else {
        original.apply(fs, arguments);
      }
    };
  };
});

var opraOK = function(done, settings, output, debug) {
  opra.build('index.html', settings, function(err, res) {

    if (debug) {
      console.log(res, output);
    }

    should.ifError(err);
    res.should.equal(output);
    done();
  });
};

global.test = function(desc, mocks, args, output) {
  it(desc, function(done) {
    mockReadFile(mocks);
    opraOK(done, args, output);
  });
};
