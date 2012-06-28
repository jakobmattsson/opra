var url = require('url');
var fs = require('fs');
var path = require('path');
var powerfs = require('powerfs');
var _ = require('underscore');

_.mixin(require('underscore.string').exports());

exports.serveConstructor = function(dependencies) {
  return function(rootpath, settings) {
    settings = settings || {};

    if (_.isUndefined(settings.assetRoot)) {
      settings.assetRoot = rootpath;
    }

    return function(req, res, next) {
      var pathname = url.parse(req.url).pathname;
      var filepath = path.join(rootpath, pathname);

      if (!fs.existsSync(filepath)) {
        next();
        return;
      }

      powerfs.isDirectory(filepath, function(err, isDirectory) {
        if (err) {
          dependencies.log("OPRA ERROR (while searching for " + filepath + ")", err);
          next();
          return;
        }

        if (isDirectory) {
          pathname = path.join(pathname, 'index.html');
          filepath = path.join(filepath, 'index.html');
        }

        if (!_.endsWith(pathname, '.html')) {
          next();
          return;
        }

        dependencies.build(filepath, settings, function(err, result) {
          if (err) {
            dependencies.log("OPRA ERROR while compiling " + pathname, err);
            next();
            return;
          }
          res.setHeader('Content-Type', 'text/html');
          res.setHeader('Content-Length', Buffer.byteLength(result));
          res.end(result);
        });
      });
    };
  };
};
