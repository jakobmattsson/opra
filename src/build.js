var fs = require('fs');
var path = require('path');
var async = require('async');
var cleanCSS = require('clean-css');
var glob = require('glob');
var npm = require('npm');
var powerfs = require('powerfs');
var browserify = require('browserify');
var _ = require('underscore');

var helpers = require('./helpers.js');

var def = function(name, func) {
  this[name] = func;
  exports[name] = func;
};
var propagate = function(callback, f) {
  return function(err) {
    if (err) {
      callback(err);
      return;
    }
    return f.apply(this, Array.prototype.slice.call(arguments, 1));
  };
};

def('filetype', function(filename, compiler) {
  return Object.keys(compiler).reduce(function(memo, type) {
    return helpers.endsWith(filename, ['.' + type]) ? compiler[type].target : memo;
  }, 'other');
});
def('whichIE', function(params) {
  if (helpers.contains(params, "ie7")) {
    return "ie7";
  }
  return undefined;
});
def('wrappIE', function(params, str) {
  if (whichIE(params) == 'ie7') {
    return "<!--[if IE 7]>" + str + "<![endif]-->";
  }
  return str;
});
def('paramsToMediaType', function(params) {
  if (helpers.contains(params, 'screen')) {
    return 'screen';
  }
  if (helpers.contains(params, 'print')) {
    return 'print';
  }
  return undefined;
});

def('compressor', function(filetype, params, content) {
  if (helpers.contains(params, 'compress')) {
    if (filetype == 'css') {
      return cleanCSS.process(content);
    } else if (filetype == 'js') {
      return helpers.uglifier(content);
    }
  }
  return content;
});

def('tagifyOne', function(tag) {
  var spaces = tag.file.spaces.slice(2);
  tag.content = tag.content.trim().split('\n').map(function(s) {
    return tag.file.spaces + s;
  }).join('\n');
  tag.content = "\n" + tag.content + "\n" + spaces;
  tag.content = compressor(tag.file.type, tag.file.params, tag.content);

  var csstag = helpers.createTag('style', {
    type: 'text/css',
    media: paramsToMediaType(tag.file.params),
    'data-path': helpers.contains(tag.file.params, 'paths') ? tag.file.name : undefined
  }, tag.content);
  var jstag = helpers.createTag('script', {
    type: tag.file.type == 'js' ? 'text/javascript' : 'text/x-opra',
    id: tag.file.type != 'js' && helpers.contains(tag.file.params, 'ids') ? "opra-" + path.basename(tag.file.name).split('.')[0] : undefined,
    'data-path': helpers.contains(tag.file.params, 'paths') ? tag.file.name : undefined
  }, tag.file.type == 'js' && helpers.contains(tag.file.params, 'escape') ? helpers.escapeInlineScript(tag.content) : tag.content);
  return spaces + wrappIE(tag.file.params, tag.file.type == 'css' ? csstag : jstag);
});
def('tagify', function(tags) {
  return tags.map(tagifyOne).join('\n');
});

def('resolveIndexFileDir', function(filename) {
  return path.resolve(process.cwd(), path.dirname(filename));
});
def('filePathToAbsolute', function(filename, assetRoot, indexFileDir) {
  return path.join(helpers.isPathAbsolute(filename) ? assetRoot : indexFileDir, filename);
});
def('filePathToAbsolute2', function(filename, assetRoot, indexFileDir) {
  var basePath = helpers.isPathAbsolute(filename) ? assetRoot : indexFileDir;
  return helpers.isPathAbsolute(filename) ? '/' + path.relative(basePath, filename) : filename;
});
def('globber', function(pattern, root, cwd, callback) {
  glob(pattern, { nonull: false, root: root, cwd: cwd }, callback);
});

def('getMatches', function(content, prefix, postfix) {
  var reg = new RegExp(" *" + prefix + "( +[^\n]*)?\n([^>]*)" + postfix, "g");

  return helpers.execAll(reg, content).map(function(x) {
    return {
      str: x[0],
      params: _.compact((x[1] || '').split(' '))
    };
  }).map(function(matchData) {
    var filename;

    var filenames = matchData.params.filter(function(p) {
      return helpers.contains(p, '.');
    });
    matchData.params = matchData.params.filter(function(p) {
      return !helpers.contains(p, '.');
    });

    if (filenames.length >= 1) {
      filename = filenames[0];
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
});
def('globMatches', function(assetRoot, indexFileDir, matches, callback) {
  async.map(matches, function(match, callback) {
    async.mapSeries(match.files, function(file, callback) {
      globber(file.name, assetRoot, indexFileDir, function(err, globbedFiles) {
        if (err) {
          callback(err);
          return;
        }
        if (!globbedFiles) {
          console.error("Found no matches for pattern: " + file.name);
        }

        callback(null, globbedFiles.map(function(globbedFile) {
          return _.extend({}, file, {
            name: filePathToAbsolute2(globbedFile, assetRoot, indexFileDir).replace(/\\/g, "/")
          });
        }));
      });
    }, function(err, result) {
      callback(err, _.extend({}, match, {
        requests: match.files,
        files: (result || []).reduce(function(mem, item) {
          return mem.concat(item);
        }, [])
      }));
    });
  }, callback);
});
def('flagMatches', function(matches, globalFlags) {

  var prec = function(params, n) {
    if (helpers.contains(params, 'always-' + n)) {
      return n;
    } else if (helpers.contains(params, 'never-' + n)) {
      return undefined;
    } else if (!_.isUndefined(globalFlags[n])) {
      if (globalFlags[n]) {
        return n;
      }
    } else if (helpers.contains(params, n)) {
      return n;
    }
    return undefined;
  };

  return matches.map(function(m) {
    return _.extend({}, m, {
      params: ['concat', 'inline', 'npm'].map(function(n) {
        return prec(m.params, n);
      }).filter(function(x) { return x; }),
      files: m.files.map(function(file) {
        return _.extend({}, file, {
          params: ['compress', 'paths', 'ids', 'escape', 'screen', 'ie7', 'print'].map(function(n) {
            return prec(file.params, n);
          }).filter(function(x) { return x; })
        });
      })
    });
  });
});
def('parseFile', function(assetRoot, globalFlags, indexFile, encoding, callback) {
  fs.readFile(indexFile, encoding, function(err, content) {
    if (err) {
      callback(err);
      return;
    }

    globMatches(assetRoot, resolveIndexFileDir(indexFile), getMatches(content, "<!--OPRA", "-->"), function(err, matches) {
      if (err) {
        callback(err);
        return;
      }

      callback(null, {
        matches: flagMatches(matches, globalFlags),
        content: content
      });
    });
  });
});

def('buildNPM', function(folder, packages, outfile, callback) {
  powerfs.mkdirp(folder, propagate(callback, function() {
    npm.load({ loglevel: 'silent' }, propagate(callback, function() {
      npm.commands.install(folder, packages, propagate(callback, function(data) {

        var cwd = process.cwd();
        process.chdir(folder);

        var b = browserify();
        b.require(packages.map(function(x) {
          return x.split('@')[0];
        }));
        var output = b.bundle();
        process.chdir(cwd);

        callback(null, output);
      }));
    }));
  }));
});
def('filesFromNPM', function(assetRoot, d, ps, callback) {
  var input = d.requests.map(function(file) {
    return file.name + '@' + (file.params[0] || '');
  });

  var outFile = path.join(assetRoot, ps.filename);
  var folder = path.join(path.dirname(outFile), '.' + path.basename(outFile));

  buildNPM(folder, input, ps.filename, function(err, data) {
    if (err) {
      callback(err);
      return;
    }

    var js = ps.spaces + helpers.createTag('script', { type: 'text/javascript', src: ps.filename }, '');
    callback(null, js, [{ name: outFile, content: data }]);
  });
});

def('filesToMultipleInclude', function(files, compiler, callback) {
  var result = files.filter(function(file) {
    return file.type != 'other';
  }).map(function(file) {
    var isCss = filetype(file.name, compiler) === 'css';
    var css = helpers.createTag('link', { rel: 'stylesheet', type: 'text/css', media: paramsToMediaType(file.params), href: file.name });
    var js = helpers.createTag('script', { type: 'text/javascript', src: file.name }, '');
    return file.spaces.slice(2) + wrappIE(file.params, isCss ? css : js);
  }).join('\n');
  callback(null, result);
});
def('filesToInline', function(compiler, files, shouldConcat, callback) {
  filesToInlineBasic(compiler, files, shouldConcat, function(err, data) {
    if (err) {
      callback(err);
      return;
    }
    callback(null, tagify(data));
  });
});
def('filesToInlineBasic', function(compiler, files, shouldConcat, callback) {
  async.mapSeries(files, function(file, callback) {

    var actualCallback = function(err, data) {
      callback(err, { file: file, content: data });
    };

    var compileType = Object.keys(compiler).filter(function(type) {
      return helpers.endsWith(file.name, ['.' + type]);
    });

    if (compileType.length > 0) {
      compiler[compileType[0]].compile(file.absolutePath, file.encoding, actualCallback);
    } else {
      fs.readFile(file.absolutePath, file.encoding, actualCallback);
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
          if (d.file.type == last.file.type &&
            whichIE(d.file.params) == whichIE(last.file.params) &&
            helpers.contains(d.file.params, 'compress') == helpers.contains(last.file.params, 'compress') &&
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
        }).join(helpers.endsWith(g[0].file.name, ['.js']) ? ';\n' : '\n') };
      });

      callback(null, d2);
    } else {
      callback(err, data);
    }
  });
});
def('concatToFiles', function(compiler, assetRoot, ps, callback) {
  var filename = ps.filename;
  var spaces = ps.spaces;

  var ft = filetype(filename, compiler);
  filesToInlineBasic(compiler, ps.files, ps.shouldConcat, function(err, data) {
    if (err) {
      callback(err);
      return;
    }
    if (data.length !== 1) {
      callback("Invalid number of files produced while concatenating");
      return;
    }

    var outFile = path.join(assetRoot, filename);
    var content = compressor(ft, data[0].file.params, data[0].content);

    if (ft == 'js') {
      var js = spaces + helpers.createTag('script', { type: 'text/javascript', src: filename }, '');
      callback(null, js, [{ name: outFile, content: content }]);
    } else if (ft == 'css') {
      var css = spaces + helpers.createTag('link', { rel: 'stylesheet', type: 'text/css', href: filename });
      callback(null, css, [{ name: outFile, content: content }]);
    } else {
      callback("Invalid filetype! Use 'js' or 'css'.");
    }
  });
});

def('transform', function(assetRoot, compiler, encoding, matches, content, callback) {
  async.reduce(matches, { cont: content, files: [] }, function(cc, d, callback) {
    var next_content = cc.cont;
    var old_outfiles = cc.files;

    var shouldConcat = helpers.contains(d.params, 'concat');

    var ps = {
      filename: d.filename,
      spaces: d.spaces,
      shouldConcat: shouldConcat,
      fileParams: d.params,
      files: d.files
    };

    var fc = function(err, data, outfiles) {
      if (err) {
        callback(err);
        return;
      }

      callback(err, { cont: helpers.safeReplace(next_content, d.match, data), files: old_outfiles.concat(outfiles || []) });
    };

    if (helpers.contains(d.params, 'npm') && d.filename) {
      filesFromNPM(assetRoot, d, ps, fc);
    } else if (helpers.contains(d.params, 'inline')) {
      filesToInline(compiler, ps.files, shouldConcat, fc);
    } else if (shouldConcat && d.filename) {
      concatToFiles(compiler, assetRoot, ps, fc);
    } else {
      filesToMultipleInclude(ps.files, compiler, fc);
    }
  }, callback);
});

def('buildConstructor', function(dependencies) {
  return function(indexFile, settings, callback) {

    if (!callback && typeof settings == 'function') {
      callback = settings;
      settings = {};
    }
    settings = settings || {};

    var indexFileDir = resolveIndexFileDir(indexFile);
    var encoding = settings.encoding || 'utf8';
    var assetRoot = path.resolve(settings.assetRoot || indexFileDir);

    var globalFlags = {
      concat: settings.concat,
      inline: settings.inline,
      compress: settings.compress,
      paths: settings.paths,
      escape: settings.escape,
      ids: settings.ids
    };

    var compiler = {
      css: {
        target: 'css',
        compile: fs.readFile
      },
      js: {
        target: 'js',
        compile: fs.readFile
      },
      less: {
        target: 'css',
        compile: function(file, encoding, callback) {
          helpers.compileLess(file, [assetRoot], encoding, callback);
        }
      },
      coffee: {
        target: 'js',
        compile: helpers.compileCoffee
      }
    };

    parseFile(assetRoot, globalFlags, indexFile, encoding, function(err, res) {
      if (err) {
        callback(err);
        return;
      }

      res.matches.forEach(function(match) {
        match.files.forEach(function(file) {
          file.absolutePath = filePathToAbsolute(file.name, assetRoot, indexFileDir);
          file.encoding = encoding;
          file.type = filetype(file.name, compiler);
        });
      });

      transform(assetRoot, compiler, encoding, res.matches, res.content, function(err, resa) {
        if (err) {
          callback(err);
          return;
        }

        var res = resa.cont;
        var outfiles = resa.files;

        async.forEach(outfiles || [], function(file, callback) {
          fs.writeFile(file.name, file.content, file.encoding || encoding, callback);
        }, function(err) {
          callback(err, res);
        });
      });
    });
  };
});
