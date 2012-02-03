var fs = require('fs');
var path = require('path');
var express = require('express');
var coffee = require('coffee-script');
var less = require('less');
var async = require('async');
var uglify = require('uglify');
var cleanCSS = require('clean-css');
var htmlMinifier = require('html-minifier')

var build = function(indexFile, settings, callback) {

  if (!callback && typeof settings == 'function') {
    callback = settings;
    settings = {};
  }
  settings = settings || {};

  var encoding = settings.encoding || 'utf8';
  var assetRoot = settings.assetRoot || path.dirname(indexFile);
  var isInline = settings.inline || false;
  var isCompressed = settings.compress || false;
  var isMarkupCompressed = settings.compressHTML || false;

  var safeReplace = function(str, target, newString) {
    var i = str.indexOf(target);
    return str.slice(0, i) + newString + str.slice(i + target.length);
  };
  var uglifier = function(code) {
    var jsp = uglify.parser;
    var pro = uglify.uglify;

    var ast = jsp.parse(code);
    ast = pro.ast_mangle(ast);
    ast = pro.ast_squeeze(ast);
    return pro.gen_code(ast);
  };
  var getMatches = function(content, prefix, postfix) {
    var matches = content.match(new RegExp(" *" + prefix + "[^>]*" + postfix, "g")) || [];
    return matches.map(function(match) {
      return {
        match: match,
        files: match.replace(prefix, "").replace(postfix, "").split('\n').filter(function(s) {
          return s.trim();
        })
      };
    });
  };
  var filesToStylesheets = function(files, callback) {
    var result = files.map(function(file) {
      return file.match(/^\s*/)[0].slice(2) + '<link rel="stylesheet" type="text/css" href="' + file.trim() + '">'
    }).join('\n');
    callback(null, result);
  };
  var filesToScripts = function(files, callback) {
    var result = files.map(function(file) {
      return file.match(/^\s*/)[0].slice(2) + '<script type="text/javascript" src="' + file.trim() + '"></script>'
    }).join('\n');
    callback(null, result);
  };
  var filesToInlineStyles = function(files, callback) {
    async.mapSeries(files, function(file, callback) {
      var fullspaces = file.match(/^\s*/)[0];
      var spaces = fullspaces.slice(2);
      var filePath = path.join(assetRoot, file.trim());

      var actualCallback = function(err, data) {
        if (err) {
          callback(err);
          return;
        }

        data = data.trim().split('\n').map(function(s) {
          return fullspaces + s;
        }).join('\n');
        data = "\n" + data + "\n" + spaces;

        if (isCompressed) {
          data = cleanCSS.process(data);
        }

        callback(null, spaces + '<style type="text/css">' + data + "</style>");
      };

      if (file.match(/\.less$/)) {
        fs.readFile(filePath, encoding, function(err, content) {
          if (err) {
            callback(err);
            return;
          }
          less.render(content, actualCallback);
        });
      } else {
        fs.readFile(filePath, encoding, actualCallback);
      }
    }, function(err, data) {
      if (err) {
        callback(err);
        return;
      }
      callback(err, data.join('\n'));
    });
  };
  var filesToInlineScripts = function(files, callback) {
    async.mapSeries(files, function(file, callback) {
      var fullspaces = file.match(/^\s*/)[0];
      var spaces = fullspaces.slice(2);
      var filePath = path.join(assetRoot, file.trim());
      var actualCallback = function(err, data) {
        if (err) {
          callback(err);
          return;
        }

        data = data.trim().split('\n').map(function(s) {
          return fullspaces + s;
        }).join('\n');
        data = "\n" + data + "\n" + spaces;

        if (isCompressed) {
          data = uglifier(data);
        }

        callback(null, spaces + '<script type="text/javascript">' + data + "</script>");
      };

      if (file.match(/\.coffee$/)) {
        fs.readFile(filePath, encoding, function(err, content) {
          if (err) {
            callback(err);
            return;
          }

          try {
            var code = coffee.compile(content);
          } catch (e) {
            callback(e)
            return;
          }

          actualCallback(null, code);
        });
      } else {
        fs.readFile(filePath, encoding, actualCallback);
      }
    }, function(err, data) {
      if (err) {
        callback(err);
        return;
      }

      callback(err, data.join('\n'));
    });
  }

  fs.readFile(indexFile, encoding, function(err, content) {
    if (err) {
      callback(err);
      return;
    }

    var styleData = getMatches(content, "<!--OPRA-STYLES", "-->");
    var jsData = getMatches(content, "<!--OPRA-SCRIPTS", "-->");

    async.waterfall([
      function(callback) {
        async.reduce(styleData, content, function(next_content, d, callback) {
          var f = isInline ? filesToInlineStyles : filesToStylesheets;
          f(d.files, function(err, data) {
            if (err) {
              callback(err);
              return;
            }
            callback(err, safeReplace(next_content, d.match, data));
          });
        }, callback);
      }, function(cnt, callback) {
        async.reduce(jsData, cnt, function(next_content, d, callback) {
          var f = isInline ? filesToInlineScripts : filesToScripts;
          f(d.files, function(err, data) {
            if (err) {
              callback(err);
              return;
            }

            callback(err, safeReplace(next_content, d.match, data));
          });

        }, callback);
      }
    ], function(err, result) {

      // Removed this until it's better understood
      //
      // if (isMarkupCompressed) {
      //   content = htmlMinifier.minify(content, { });
      // }

      callback(err, result);
    });
  });
}
var serve = function(path, settings) {
  return function(req, res, next) {
    if (req.url === '/' || req.url === '/index.html') {
      build(path + '/index.html', settings, function(err, result) {
        if (err) {
          next();
          return;
        }
        res.send(result, { 'Content-Type': 'text/html' })
      });
    } else {
      next();
    }
  };
};

exports.build = build;
exports.serve = serve;
