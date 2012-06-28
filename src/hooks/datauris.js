var fs = require('fs');
var path = require('path');
var async = require('async');
var powerfs = require('powerfs');
var _ = require('underscore');
var helpers = require('../helpers');

var dataUrl = function(filename, callback) {
  fs.readFile(filename, function(err, data) {
    if (err) {
      callback(err);
      return;
    }

    var format = path.extname(filename).slice(1);
    var enc = data.toString('base64');

    if (enc.length >= Math.pow(2, 15)) {
      console.log("Warning: Very long encoded string; IE (and possibly other browsers) wont like this!");
    }

    callback(null, "url(data:image/" + format + ";base64," + enc + ")");
  });
};

module.exports = function(hooks) {
  hooks.preproc = function(files, meta, callback) {
    var assetRoot = meta.assetRoot;

    var globs = _.flatten(_.pluck(files, 'globs'));

    async.forEachSeries(globs, function(item, callback) {
      if (!_.contains(item.params, 'datauris')) {
        callback();
        return;
      }

      var newName = '/' + path.join('.opra-cache', path.relative(assetRoot, item.absolutePath));
      var r2 = path.join(assetRoot, newName);
      var haveReplaced = false;

      fs.readFile(item.absolutePath, item.encoding, function(err, data) {
        if (err) {
          callback(err);
          return;
        }

        var matches = data.match(/url\('[^']*\.(png|jpeg|jpg|gif)'\)|url\("[^"]*\.(png|jpeg|jpg|gif)"\)/g) || [];

        async.forEachSeries(matches, function(item, callback) {
          var filename = item.slice(5).slice(0, -2);
          var absolutePath = path.join(assetRoot, filename);

          dataUrl(absolutePath, function(err, encoded) {
            if (err) {
              callback(err);
              return;
            }

            haveReplaced = true;
            data = helpers.safeReplace(data, item, encoded);

            callback();
          });

        }, function(err) {
          powerfs.writeFile(r2, data, item.encoding, function(err) {

            if (haveReplaced) {
              item.absolutePath = r2;
              item.name = newName;
            }

            callback();
          });
        });
      });
    }, function(err) {
      callback(err, files);
    });
  };
};