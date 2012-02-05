var fs = require('fs');
var path = require('path');
var express = require('express');
var coffee = require('coffee-script');
var less = require('less');
var async = require('async');
var uglify = require('uglify-js');
var cleanCSS = require('clean-css');
var htmlMinifier = require('html-minifier');

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
  var jsfile = settings.jsfile;
  var cssfile = settings.cssfile;


  var compileCoffee = function(filePath, callback) {
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

      callback(null, code);
    });
  };
  var compileLess = function(filePath, callback) {
    fs.readFile(filePath, encoding, function(err, content) {
      if (err) {
        callback(err);
        return;
      }
      less.render(content, { paths: [path.dirname(filePath)] }, callback);
    });
  };


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
        files: match.replace(prefix, "").replace(postfix, "").split('\n').map(function(s) {
          return s.split('#')[0];
        }).filter(function(s) {
          return s.trim();
        }).map(function(s) {
          var data = s.split('@');
          return {
            name: data[0].trim(),
            params: data.length > 1 ? data[1].split(',').map(function(p) { return p.trim(); }) : [],
            spaces: s.match(/^\s*/)[0] || ''
          };
        })
      };
    });
  };
  var filesToMultipleInclude = function(isCss, files, callback) {
    var result = files.map(function(file) {
      var css ='<link rel="stylesheet" type="text/css" href="' + file.name + '">';
      var js = '<script type="text/javascript" src="' + file.name + '"></script>';
      return file.spaces.slice(2) + (isCss ? css : js);
    }).join('\n');
    callback(null, result);
  };

  var filesToInline = function(isCss, files, callback) {
    if (isCss)
      filesToInlineStyles(isCss, files, callback);
    else
      filesToInlineScripts(isCss, files, callback);
  };

  var filesToInlineStyles = function(isCss, files, callback) {
    async.mapSeries(files, function(file, callback) {
      var spaces = file.spaces.slice(2);
      var filePath = path.join(assetRoot, file.name);
      var actualCallback = function(err, data) {
        if (err) {
          callback(err);
          return;
        }

        data = data.trim().split('\n').map(function(s) {
          return file.spaces + s;
        }).join('\n');
        data = "\n" + data + "\n" + spaces;

        if (isCompressed && file.params.indexOf('nocompress') === -1) {
          if (isCss) {
            data = cleanCSS.process(data);
          } else {
            data = uglifier(data);
          }
        }

        var csstag = '<style type="text/css">' + data + "</style>";
        var jstag = '<script type="text/javascript">' + data + "</script>";

        callback(null, spaces + (isCss ? csstag : jstag));
      };

      if (file.name.match(/\.less$/)) {
        compileLess(filePath, actualCallback);
      } else if (file.name.match(/\.coffee$/)) {
        compileCoffee(filePath, actualCallback);
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
  var filesToInlineScripts = function(isCss, files, callback) {
    async.mapSeries(files, function(file, callback) {
      var spaces = file.spaces.slice(2);
      var filePath = path.join(assetRoot, file.name);
      var actualCallback = function(err, data) {
        if (err) {
          callback(err);
          return;
        }

        data = data.trim().split('\n').map(function(s) {
          return file.spaces + s;
        }).join('\n');
        data = "\n" + data + "\n" + spaces;

        if (isCompressed && file.params.indexOf('nocompress') === -1) {
          if (isCss) {
            data = cleanCSS.process(data);
          } else {
            data = uglifier(data);
          }
        }

        var csstag = '<style type="text/css">' + data + "</style>";
        var jstag = '<script type="text/javascript">' + data + "</script>";

        callback(null, spaces + (isCss ? csstag : jstag));
      };

      if (file.name.match(/\.less$/)) {
        compileLess(filePath, actualCallback);
      } else if (file.name.match(/\.coffee$/)) {
        compileCoffee(filePath, actualCallback);
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
  var filesToInclude = function(css, files, callback) {
    var filename = css ? cssfile : jsfile;

    async.mapSeries(files, function(file, callback) {
      var spaces = file.spaces.slice(2);
      var filePath = path.join(assetRoot, file.name);
      var actualCallback = function(err, data) {
        if (err) {
          callback(err);
          return;
        }

        // space it up!
        if (!filename) {
          data = data.trim().split('\n').map(function(s) {
            return file.spaces + s;
          }).join('\n');
          data = "\n" + data + "\n" + spaces;
        }

        if (isCompressed && file.params.indexOf('nocompress') === -1) {
          data = uglifier(data);
        }

        callback(null, data);
      };

      if (file.name.match(/\.coffee$/)) {
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

      var include = null;

      if (css) {
        include = files[0].spaces.slice(2) + '<link rel="stylesheet" type="text/css" href="' + filename + '">';
      } else {
        include = files[0].spaces.slice(2) + '<script type="text/javascript" src=' + filename + '></script>'
      }

      var d = data.join('\n')

      callback(err, include, [{ name: path.join(assetRoot, filename), content: d }]);
    });
  };

  fs.readFile(indexFile, encoding, function(err, content) {
    if (err) {
      callback(err);
      return;
    }

    var styleData = getMatches(content, "<!--OPRA-STYLES", "-->");
    var jsData = getMatches(content, "<!--OPRA-SCRIPTS", "-->");

    var reducer = function(isCss) {
      return function(next_content, d, callback) {
        var f = isInline ? filesToInline : filesToMultipleInclude;

        if (isCss ? cssfile : jsfile) {
          f = filesToInclude;
        }

        f(isCss, d.files, function(err, data, outfiles) {
          if (err) {
            callback(err);
            return;
          }

          async.forEach(outfiles || [], function(file, callback) {
            fs.writeFile(file.name, file.content, encoding, callback);
          }, function(err) {
            callback(err, safeReplace(next_content, d.match, data));
          });
        });
      };
    };

    async.waterfall([
      function(callback) {
        async.reduce(styleData, content, reducer(true), callback);
      }, function(cnt, callback) {
        async.reduce(jsData, cnt, reducer(false), callback);
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
