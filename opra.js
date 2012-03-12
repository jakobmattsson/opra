var fs = require('fs');
var url = require('url');
var path = require('path');
var express = require('express');
var coffee = require('coffee-script');
var less = require('less');
var async = require('async');
var uglify = require('uglify-js');
var cleanCSS = require('clean-css');
var glob = require('glob');

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
  var jsfile = settings.jsfile;
  var cssfile = settings.cssfile;
  var showPaths = settings.paths;
  var concatFiles = settings.concat;

  var isUndefined = function(x) {
    return typeof x == 'undefined';
  };
  var compileCoffee = function(filePath, callback) {
    fs.readFile(filePath, encoding, function(err, content) {
      var code = null;

      if (err) {
        callback(err);
        return;
      }

      try {
        code = coffee.compile(content);
      } catch (e) {
        callback(e);
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
  var uglifier = function(code) {
    var jsp = uglify.parser;
    var pro = uglify.uglify;

    var ast = jsp.parse(code);
    ast = pro.ast_mangle(ast);
    ast = pro.ast_squeeze(ast);
    return pro.gen_code(ast);
  };
  var endsWith = function(str, ends) {
    return ends.some(function(end) {
      return end == str.slice(-end.length);
    });
  };
  var safeReplace = function(str, target, newString) {
    var i = str.indexOf(target);
    return str.slice(0, i) + newString + str.slice(i + target.length);
  };
  var safeReplaceAll = function(str, target, newString) {
    while (true) {
      var i = str.indexOf(target);

      if (i === -1) {
        return str;
      }

      str = str.slice(0, i) + newString + str.slice(i + target.length);
    }
  };

  var filetype = function(filename) {
    if (endsWith(filename, ['.css', '.less'])) {
      return 'css';
    }
    if (endsWith(filename, ['.js', '.coffee'])) {
      return 'js';
    }
    return 'other';
  };
  var iewrap = function(params) {
    if (params.indexOf("ie7") !== -1) {
      return "ie7";
    }
    return undefined;
  };
  var wrappIE = function(params, str) {
    if (iewrap(params) == 'ie7') {
      return "<!--[if IE 7]>" + str + "<![endif]-->";
    }
    return str;
  };
  var paramsToMediaType = function(params) {
    if (params.indexOf("screen") !== -1) {
      return 'screen';
    }
    if (params.indexOf("print") !== -1) {
      return 'print';
    }
    return undefined;
  };

  var createTag = function(name, attributes, content) {
    return "<" + name + Object.keys(attributes).filter(function(key) {
      return !isUndefined(attributes[key]);
    }).map(function(key) {
      return " " + key + '="' + attributes[key] + '"';
    }).join('') + (typeof content == 'string' ? ">" + content + "</" + name + ">" : " />");
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
  var globMatches = function(matches, callback) {
    async.map(matches, function(match, callback) {
      async.map(match.files, function(file, callback) {
        var globbedFiles = glob.sync(file.name, { nonull: true, cwd: assetRoot, root: assetRoot });
        callback(null, globbedFiles.map(function(globbedFile) {
          return { name: path.relative(assetRoot, globbedFile), params: file.params, spaces: file.spaces };
        }));
      }, function(err, result) {
        callback(err, {
          match: match.match,
          files: (result || []).reduce(function(mem, item) {
            return mem.concat(item);
          }, [])
        });
      });
    }, callback);
  };

  var filesToMultipleInclude = function(______________________, files, callback) {
    var result = files.filter(function(file) {
      return filetype(file.name) != 'other';
    }).map(function(file) {
      var isCss = endsWith(file.name, ['.css', '.less']);
      var css = createTag('link', { rel: 'stylesheet', type: 'text/css', media: paramsToMediaType(file.params), href: file.name });
      var js = createTag('script', { type: 'text/javascript', src: file.name }, '');
      return file.spaces.slice(2) + wrappIE(file.params, isCss ? css : js);
    }).join('\n');
    callback(null, result);
  };
  var filesToInline = function(_______________________, files, callback) {
    async.mapSeries(files, function(file, callback) {
      var filePath = path.join(assetRoot, file.name);
      var actualCallback = function(err, data) {
        callback(err, { file: file, content: data });
      };

      if (endsWith(file.name, ['.less'])) {
        compileLess(filePath, actualCallback);
      } else if (endsWith(file.name, ['.coffee'])) {
        compileCoffee(filePath, actualCallback);
      } else {
        fs.readFile(filePath, encoding, actualCallback);
      }
    }, function(err, data) {
      if (err) {
        callback(err);
        return;
      }

      var tagify = function(data) {
        return data.map(function(d) {

          var spaces = d.file.spaces.slice(2);
          d.content = d.content.trim().split('\n').map(function(s) {
            return d.file.spaces + s;
          }).join('\n');
          d.content = "\n" + d.content + "\n" + spaces;

          if (isCompressed && d.file.params.indexOf('never-compress') === -1) {
            if (filetype(d.file.name) == 'css') {
              d.content = cleanCSS.process(d.content);
            } else if (filetype(d.file.name) == 'js') {
              d.content = uglifier(d.content);
            }
          }

          var csstag = createTag('style', { type: 'text/css', media: paramsToMediaType(d.file.params), 'data-path': showPaths ? d.file.name : undefined }, d.content);
          var jstag = createTag('script', { type: filetype(d.file.name) == 'js' ? 'text/javascript' : 'text/x-opra', 'data-path': showPaths ? d.file.name : undefined }, d.content);
          return spaces + wrappIE(d.file.params, filetype(d.file.name) == 'css' ? csstag : jstag);
        }).join('\n');
      };

      if (concatFiles) {
        var re = data.reduce(function(groups, d) {
          if (groups.length === 0) {
            groups.push([d]);
          } else {
            var last = groups.slice(-1)[0][0];
            if (filetype(d.file.name) == filetype(last.file.name) &&
              iewrap(d.file.params) == iewrap(last.file.params) &&
              (d.file.params.indexOf('never-compress') === -1) == (last.file.params.indexOf('never-compress') === -1) &&
              paramsToMediaType(d.file.params) == paramsToMediaType(last.file.params)) {
              groups.slice(-1)[0].push(d);
            } else {
              groups.push([d]);
            }
          }
          return groups;
        }, []);

        var d2 = re.map(function(g) {
          return { file: g[0].file, content: g.map(function(x) {
            return x.content.trim();
          }).join('\n') };
        });

        callback(null, tagify(d2));
      } else {
        callback(err, tagify(data));
      }
    });
  };
  var filesToInclude = function(__________css, files, callback) {
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

        if (isCompressed && file.params.indexOf('never-compress') === -1) {
          if (css) {
            data = cleanCSS.process(data);
          } else {
            data = uglifier(data);
          }
        }

        callback(null, data);
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

      var include = null;
      var params = files[0].params; // this is a hack. files should already be grouped according to parameters!!!

      if (css) {
        include = files[0].spaces.slice(2) + wrappIE(params, createTag('link', { rel: 'stylesheet', media: paramsToMediaType(file.params), type: 'text/css', href: filename }));
      } else {
        include = files[0].spaces.slice(2) + wrappIE(params, createTag('script', { type: 'text/javascript', src: filename }, ''));
      }

      callback(err, include, [{ name: path.join(assetRoot, filename), content: data.join(isCompressed ? ';' : '\n') }]);
    });
  };

  fs.readFile(indexFile, encoding, function(err, content) {
    if (err) {
      callback(err);
      return;
    }

    globMatches(getMatches(content, "<!--OPRA", "-->"), function(err, matches) {
      async.reduce(matches, content, function(next_content, d, callback) {
        var isCss = true;
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
      }, callback);
    });
  });
};
var serve = function(path, settings) {
  settings = settings || {};
  settings.url = settings.url || '/index.html';

  return function(req, res, next) {
    var pathname = url.parse(req.url).pathname;

    if (settings.url == pathname) {
      build(path + pathname, settings, function(err, result) {
        if (err) {
          next();
          return;
        }
        res.send(result, { 'Content-Type': 'text/html' });
      });
    } else {
      next();
    }
  };
};

exports.build = build;
exports.serve = serve;
