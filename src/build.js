var fs = require('fs');
var path = require('path');
var async = require('async');
var cleanCSS = require('clean-css');
var glob = require('glob');
var npm = require('npm');
var powerfs = require('powerfs');
var browserify = require('browserify');
var _ = require('underscore');
var uglify = require('uglify-js');

var helpers = require('./helpers.js');
var parse = require('./parse.js');
var read = require('./read.js');
var build = exports;

var def = function(name, func) {
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
    return _.endsWith(filename, '.' + type) ? compiler[type].target : memo;
  }, 'other');
});

def('resolveIndexFileDir', function(filename) {
  return path.resolve(process.cwd(), path.dirname(filename));
});
def('filePathToAbsolute', function(filename, assetRoot, indexFileDir) {
  return path.join(helpers.isPathAbsolute(filename) ? assetRoot : indexFileDir, filename);
});

def('buildNPM', function(folder, packages, prelude, callback) {
  powerfs.mkdirp(folder, propagate(callback, function() {
    npm.load({ loglevel: 'silent' }, propagate(callback, function() {
      npm.commands.install(folder, packages, propagate(callback, function(data) {

        var cwd = process.cwd();
        process.chdir(folder);

        var b = browserify();

        if (!prelude) {
          b.files = [];
          b.prepends = [];
        }

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
def('filesFromNPM', function(first, assetRoot, d, filename, aliases, callback) {
  var packages = [d];
  var packageName = d.split('@')[0];
  var packageVersion = d.split('@').slice(1) || 'any';
  var delayedCallback = _.after(2, callback);

  var requireFile = path.join(filename, packageName + "-require.js");
  var packageFile = path.join(filename, packageName + ".js");
  var versionFile = path.join(filename, packageName + ".version");

  var requireContent = aliases.map(function(alias) {
    return "window['" + alias + "'] = require('" + packageName + "');";
  }).join('\n');

  if (requireContent) {
    powerfs.writeFile(requireFile, requireContent, 'utf8', delayedCallback);
  } else {
    delayedCallback();
  }

  var updateFile = function() {
    build.buildNPM(filename, [d], first, function(err, data) {
      if (err) {
        delayedCallback(err);
        return;
      }

      powerfs.writeFile(versionFile, packageVersion, 'utf8', function(err) {
        if (err) {
          delayedCallback(err);
          return;
        }

        powerfs.writeFile(packageFile, data, 'utf8', delayedCallback);
      });
    });
  };

  powerfs.fileExists(versionFile, function(exists) {
    if (!exists) {
      updateFile();
      return;
    }

    fs.readFile(versionFile, 'utf8', function(err, data) {
      if (err || data != packageVersion) {
        updateFile();
      } else {
        delayedCallback();
      }
    });
  });
});


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

var filter3 = function(files, meta, callback) {
  var assetRoot = meta.assetRoot;

  async.forEachSeries(files, function(item, callback) {
    var type = null;

    if (_.endsWith(item.name, '.js')) {
      type = "js";
    }
    if (_.endsWith(item.name, '.coffee')) {
      type = "coffee";
    }

    if (!_.contains(item.params, 'module')) {
      callback();
      return;
    }

    var pathRelativeToRoot = path.relative(assetRoot, item.absolutePath);
    var newName = '/' + path.join('.opra-cache', path.relative(assetRoot, item.absolutePath));
    var r2 = path.join(assetRoot, newName);
    var haveReplaced = false;

    fs.readFile(item.absolutePath, item.encoding, function(err, data) {
      if (err) {
        callback(err);
        return;
      }

      var newData = "";

      if (type == "js") {
        newData += "require.define('" + pathRelativeToRoot + "', function(require, module, exports, __dirname, __filename) {\n";
      }
      if (type == "coffee") {
        newData += "require.define '" + pathRelativeToRoot + "', (require, module, exports, __dirname, __filename) ->\n";
      }

      newData += data.split('\n').map(function(x) {
        return "  " + x;
      }).join('\n');

      if (type == "js") {
        newData += "\n});";
      }

      powerfs.writeFile(r2, newData, item.encoding, function(err) {
        if (err) {
          callback(err);
          return;
        }

        item.absolutePath = r2;
        item.name = newName;
        callback();
      });
    });
  }, callback);
};

var filter1 = function(files, meta, callback) {
  var assetRoot = meta.assetRoot;

  async.forEachSeries(files, function(item, callback) {
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
  }, callback);
};
var filter2 = function(files, meta, callback) {
  var hasPreludedCommonJS = false;
  var assetRoot = meta.assetRoot;
  var getNpmFolder = meta.getNpmFolder;

  var npmreqs = files.filter(function(file) {
    return _.contains(file.params, 'npm');
  });

  async.forEachSeries(npmreqs, function(item, callback) {
    var aliases = item.params.filter(function(xx) {
      return _.startsWith(xx, 'as:');
    }).map(function(xx) {
      return xx.slice(3);
    });
    build.filesFromNPM(!hasPreludedCommonJS, assetRoot, item.name, getNpmFolder(), aliases, function(err) {
      hasPreludedCommonJS = true;
      callback(err);
    });
  }, function(err) {
    if (err) {
      callback(err);
      return;
    }

    npmreqs.forEach(function(n) {
      var name = n.name;
      n.absolutePath = path.join(getNpmFolder(), name.split('@')[0] + ".js");
      n.name = "/" + path.relative(assetRoot, n.absolutePath);
      n.type = 'js';
      n.encoding = 'utf8';
    });

    callback();
  });
};


def('transform', function(assetRoot, pars, encoding, indexFile, matches, content, callback) {

  var getNpmFolder = function() {
    var r1 = path.relative(assetRoot, indexFile);
    var r2 = path.join(assetRoot, '.opra-cache', r1);
    var r3 = r2 + '-npm';
    return r3;
  };

  async.reduce(matches, { cont: content, files: [] }, function(cc, d, callback) {
    var next_content = cc.cont;
    var old_outfiles = cc.files;

    var shouldConcat = _.contains(d.params, 'concat');

    var expandedFiles = d.files.map(function(file) {
      if (_.contains(file.params, 'npm') && file.params.some(function(p) { return _.startsWith(p, 'as:'); })) {

        var abs = path.join(getNpmFolder(), file.name.split('@')[0] + "-require.js");
        var reqFile = {
          absolutePath: abs,
          name: "/" + path.relative(assetRoot, abs),
          type: 'js',
          encoding: 'utf8',
          spaces: file.spaces,
          params: _.without(file.params, 'npm')
        };
        return [file, reqFile];
      } else {
        return [file];
      }
    });

    var ps = {
      spaces: d.spaces,
      files: _.flatten(expandedFiles)
    };

    async.forEachSeries([filter2, filter1, filter3], function(filt, callback) {
      filt(ps.files, { assetRoot: assetRoot, getNpmFolder: getNpmFolder }, callback);
    }, function(err) {
      if (err) {
        callback(err);
        return;
      }

      read.filesToInlineBasic(pars, ps.files, {
        shouldConcat: shouldConcat,
        filename: d.filename,
        absolutePath: d.filename ? path.join(assetRoot, d.filename) : undefined,
        fileType: d.type
      }, function(err, data, outfiles) {
        if (err) {
          callback(err);
          return;
        }

        callback(err, {
          cont: helpers.safeReplace(next_content, d.match, data),
          files: old_outfiles.concat(outfiles || [])
        });
      });
    });
  }, callback);
});

def('buildConstructor', function(dependencies) {
  return function(indexFile, settings, callback) {

    if (!callback && typeof settings == 'function') {
      callback = settings;
      settings = {};
    }
    settings = settings || {};

    var indexFileDir = build.resolveIndexFileDir(indexFile);
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
      },
      '.': {
        target: 'other',
        compile: fs.readFile
      }
    };

    var compressor = {
      css: function(code, callback) {
        return cleanCSS.process(code);
      },
      js: function(code, callback) {
        return uglify(code || '');
      }
    };

    parse.parseFile(assetRoot, globalFlags, indexFile, encoding, function(err, res) {
      if (err) {
        callback(err);
        return;
      }

      // some ugly preprocessing in order to merge globbed files with non-globbed
      res.matches.forEach(function(m) {
        m.files = _.flatten(m.files.map(function(file) {
          if (!_.contains(file.params, 'npm')) {
            return file.globs.map(function(g) {
              return _.extend({}, file, {
                name: g
              });
            });
          } else {
            return [file];
          }
        }));
      });

      res.matches.forEach(function(match) {
        match.type = build.filetype(match.filename, compiler);
        match.files.forEach(function(file) {
          file.absolutePath = build.filePathToAbsolute(file.name, assetRoot, indexFileDir);
          file.encoding = encoding;
          file.type = build.filetype(file.name, compiler);
        });
      });

      build.transform(assetRoot, { compiler: compiler, compressor: compressor }, encoding, indexFile, res.matches, res.content, function(err, resa) {
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
