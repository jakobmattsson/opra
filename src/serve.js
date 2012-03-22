var fs = require('fs');
var url = require('url');
var path = require('path');
var helpers = require('./helpers.js');

exports.serveConstructor = function(dependencies) {
  return function(rootpath, settings) {
    settings = settings || {};
    settings.url = settings.url || '/index.html';

    if (helpers.isUndefined(settings.assetRoot)) {
      settings.assetRoot = rootpath;
    }

    return function(req, res, next) {
      var pathname = url.parse(req.url).pathname;
      var filepath = path.join(rootpath, pathname);

      if (!helpers.endsWith(pathname, ['.html'])) {
        next();
        return;
      }

      fs.stat(filepath, function(err, stat) {
        if (err) {
          dependencies.log("OPRA ERROR: While searching for " + filepath + " the following was caught:", err);
          return;
        }

        if (stat.isDirectory()) {
          pathname = path.join(pathname, 'index.html');
          filepath = path.join(filepath, 'index.html');
        }

        dependencies.build(filepath, settings, function(err, result) {
          if (err) {
            dependencies.log("OPRA ERROR: While compiling " + pathname + " the following was caught:", err);
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