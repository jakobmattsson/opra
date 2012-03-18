var fs = require('fs');
var url = require('url');
var path = require('path');
var coffee = require('coffee-script');
var less = require('less');
var async = require('async');
var uglify = require('uglify-js');
var cleanCSS = require('clean-css');
var glob = require('glob');

var isUndefined = function(x) {
  return typeof x == 'undefined';
};
var compileCoffee = function(filePath, encoding, callback) {
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
var compileLess = function(filePath, paths, encoding, callback) {
  fs.readFile(filePath, encoding, function(err, content) {
    if (err) {
      callback(err);
      return;
    }
    less.render(content, { paths: paths.concat([path.dirname(filePath)]) }, callback);
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
var execAll = function(regexp, str) {
  var match;
  var matches = [];

  while ((match = regexp.exec(str)) != null) {
    matches.push(match);
  }

  return matches;
};
var removeIndex = function(array, index) {
  var a = array.slice(0);
  a.splice(index, 1);
  return a;
};
var removeElement = function(array, element) {
  var i = array.indexOf(element);
  if (i !== -1) {
    return removeIndex(array, i);
  }
  return array;
};
var arrayContains = function(array, element) {
  return array.indexOf(element) !== -1;
};
var createTag = function(name, attributes, content) {
  return "<" + name + Object.keys(attributes).filter(function(key) {
    return !isUndefined(attributes[key]);
  }).map(function(key) {
    return " " + key + '="' + attributes[key] + '"';
  }).join('') + (typeof content == 'string' ? ">" + content + "</" + name + ">" : " />");
};

var build = function(indexFile, settings, callback) {

  if (!callback && typeof settings == 'function') {
    callback = settings;
    settings = {};
  }
  settings = settings || {};

  var indexFileDir = path.resolve(process.cwd(), path.dirname(indexFile));
  var encoding = settings.encoding || 'utf8';
  var assetRoot = path.resolve(settings.assetRoot || indexFileDir);

  var globalFlags = {
    concat: settings.concat,
    inline: settings.inline,
    compress: settings.compress,
    paths: settings.paths,
    ids: settings.ids
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
    if (arrayContains(params, "ie7")) {
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
    if (arrayContains(params, "screen")) {
      return 'screen';
    }
    if (arrayContains(params, "print")) {
      return 'print';
    }
    return undefined;
  };



  var getMatches = function(content, prefix, postfix) {
    var reg = new RegExp(" *" + prefix + "( +[^\n]*)?\n([^>]*)" + postfix, "g");

    return execAll(reg, content).map(function(x) {
      return {
        str: x[0],
        params: (x[1] || '').split(' ').map(function(x) {
          return x.trim();
        }).filter(function(x) {
          return x;
        })
      };
    }).map(function(matchData) {
      var filename = undefined;

      if (matchData.params.length >= 1 && endsWith(matchData.params[0], ['.js', '.css'])) {
        filename = matchData.params[0];
      }

      return {
        match: matchData.str,
        filename: filename,
        spaces: matchData.str.match(/^\s*/)[0],
        params: matchData.params,
        files: matchData.str.replace(prefix, "").replace(postfix, "").split('\n').slice(1).map(function(s) {
          return s.split('#')[0];
        }).filter(function(s) {
          return s.trim();
        }).map(function(s) {
          var data = s.split('@');
          return {
            name: data[0].trim(),
            params: data.length > 1 ? data[1].split(' ').map(function(p) { return p.trim(); }).filter(function(x) { return x; }) : [],
            spaces: s.match(/^\s*/)[0] || ''
          };
        })
      };
    });
  };
  var globMatches = function(matches, callback) {
    async.map(matches, function(match, callback) {
      async.mapSeries(match.files, function(file, callback) {
        var basePath = file.name && file.name[0] == '/' ? assetRoot : indexFileDir;
        glob(file.name, { nonull: false, root: assetRoot, cwd: indexFileDir  }, function(err, globbedFiles) {
          if (err) {
            callback(err);
            return;
          }
          if (!globbedFiles) {
            console.error("Found no matches for pattern: " + file.name);
          }

          var files = globbedFiles.map(function(globbedFile) {
            return {
              name: globbedFile && globbedFile[0] == '/' ? '/' + path.relative(basePath, globbedFile) : globbedFile,
              params: file.params,
              spaces: file.spaces
            };
          });

          callback(null, files);
        });
      }, function(err, result) {
        callback(err, {
          match: match.match,
          spaces: match.spaces,
          filename: match.filename,
          params: match.params,
          files: (result || []).reduce(function(mem, item) {
            return mem.concat(item);
          }, [])
        });
      });
    }, callback);
  };

  var tagify = function(data) {
    return data.map(function(d) {

      var spaces = d.file.spaces.slice(2);
      d.content = d.content.trim().split('\n').map(function(s) {
        return d.file.spaces + s;
      }).join('\n');
      d.content = "\n" + d.content + "\n" + spaces;

      if (arrayContains(d.file.params, 'compress')) {
        if (filetype(d.file.name) == 'css') {
          d.content = cleanCSS.process(d.content);
        } else if (filetype(d.file.name) == 'js') {
          d.content = uglifier(d.content);
        }
      }

      var csstag = createTag('style', {
        type: 'text/css',
        media: paramsToMediaType(d.file.params),
        'data-path': arrayContains(d.file.params, 'paths') ? d.file.name : undefined
      }, d.content);
      var jstag = createTag('script', {
        type: filetype(d.file.name) == 'js' ? 'text/javascript' : 'text/x-opra',
        id: filetype(d.file.name) != 'js' && arrayContains(d.file.params, 'ids') ? "opra-" + path.basename(d.file.name).split('.')[0] : undefined,
        'data-path': arrayContains(d.file.params, 'paths') ? d.file.name : undefined
      }, d.content);
      return spaces + wrappIE(d.file.params, filetype(d.file.name) == 'css' ? csstag : jstag);
    }).join('\n');
  };

  var filesToMultipleInclude = function(filename, spaces, shouldConcat, fileParams, files, callback) {
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
  var filesToInline = function(filename, spaces, shouldConcat, fileParams, files, callback) {
    filesToInlineBasic(filename, spaces, shouldConcat, fileParams, files, function(err, data) {
      if (err) {
        callback(err);
        return;
      }
      callback(null, tagify(data));
    });
  };
  var filesToInlineBasic = function(filename, spaces, shouldConcat, fileParams, files, callback) {
    async.mapSeries(files, function(file, callback) {

      var basePath = file.name && file.name[0] == '/' ? assetRoot : indexFileDir;
      var filePath = path.join(basePath, file.name);

      var actualCallback = function(err, data) {
        callback(err, { file: file, content: data });
      };

      if (endsWith(file.name, ['.less'])) {
        compileLess(filePath, [assetRoot], encoding, actualCallback);
      } else if (endsWith(file.name, ['.coffee'])) {
        compileCoffee(filePath, encoding, actualCallback);
      } else {
        fs.readFile(filePath, encoding, actualCallback);
      }
    }, function(err, data) {
      if (err) {
        callback(err);
        return;
      }

      if (shouldConcat) {
        var re = data.reduce(function(groups, d) {
          if (groups.length === 0) {
            groups.push([d]);
          } else {
            var last = groups.slice(-1)[0][0];
            if (filetype(d.file.name) == filetype(last.file.name) &&
              iewrap(d.file.params) == iewrap(last.file.params) &&
              (d.file.params.indexOf('compress') === -1) == (last.file.params.indexOf('compress') === -1) &&
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
          }).join(endsWith(g[0].file.name, ['.js']) ? ';\n' : '\n') };
        });

        callback(null, d2);
      } else {
        callback(err, data);
      }
    });
  };
  var concatToFiles = function(filename, spaces, shouldConcat, fileParams, files, callback) {
    var ft = filetype(filename);
    filesToInlineBasic(filename, spaces, shouldConcat, fileParams, files, function(err, data) {
      if (err) {
        callback(err);
        return;
      }
      if (data.length !== 1) {
        callback("Invalid number of files produced while concatenating");
        return;
      }

      var outFile = path.join(assetRoot, filename);
      var content = data[0].content;

      if (arrayContains(data[0].file.params, 'compress')) {
        if (filetype(outFile) == 'css') {
          content = cleanCSS.process(content);
        } else if (filetype(outFile) == 'js') {
          content = uglifier(content);
        }
      }

      fs.writeFile(outFile, content, encoding, function(err) {
        if (err) {
          callback(err);
          return;
        }

        if (ft == 'js') {
          var js = spaces + createTag('script', { type: 'text/javascript', src: filename }, '');
          callback(null, js);
        } else if (ft == 'css') {
          var css = spaces + createTag('link', { rel: 'stylesheet', type: 'text/css', href: filename });
          callback(null, css);
        } else {
          callback("Invalid filetype '" + fileType + "'! Use 'js' or 'css'.");
        }
      });
    });
  };

  fs.readFile(indexFile, encoding, function(err, content) {
    if (err) {
      callback(err);
      return;
    }

    globMatches(getMatches(content, "<!--OPRA", "-->"), function(err, matches) {
      if (err) {
        callback(err);
        return;
      }


      matches.forEach(function(f) {
        ['concat', 'inline'].forEach(function(n) {

          if (arrayContains(f.params, 'always-' + n)) {
            f.params.push(n);
          } else if (arrayContains(f.params, 'never-' + n)) {
            f.params = removeElement(f.params, n);
          } else if (!isUndefined(globalFlags[n])) {
            if (globalFlags[n]) {
              f.params.push(n);
            } else {
              f.params = removeElement(f.params, n);
            }
          }

          f.params = removeElement(f.params, 'always-' + n);
          f.params = removeElement(f.params, 'never-' + n);
        });
      });


      matches.forEach(function(m) {
        m.files.forEach(function(f) {
          ['compress', 'paths', 'ids'].forEach(function(n) {
            if (arrayContains(f.params, 'always-' + n) || (!arrayContains(f.params, 'never-' + n) && globalFlags[n])) {
              f.params.push(n);
            }

            f.params = removeElement(f.params, 'always-' + n);
            f.params = removeElement(f.params, 'never-' + n);
          });
        });
      });



      async.reduce(matches, content, function(next_content, d, callback) {
        var shouldConcat = arrayContains(d.params, 'concat');
        var f = arrayContains(d.params, 'inline') ? filesToInline : (shouldConcat && d.filename ? concatToFiles : filesToMultipleInclude);

        f(d.filename, d.spaces, shouldConcat, d.params, d.files, function(err, data, outfiles) {
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

  if (isUndefined(settings.assetRoot)) {
    settings.assetRoot = path;
  }

  return function(req, res, next) {
    var pathname = url.parse(req.url).pathname;

    if (endsWith(pathname, ['.html'])) {
      build(path + pathname, settings, function(err, result) {
        if (err) {
          console.log("OPRA ERROR: While compiling " + pathname + " the following was caught:", err);
          next();
          return;
        }
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Length', Buffer.byteLength(result));
        res.end(result);
      });
    } else {
      next();
    }
  };
};

exports.build = build;
exports.serve = serve;
