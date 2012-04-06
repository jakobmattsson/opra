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
def('whichIE', function(params) {
  if (_.contains(params, "ie7")) {
    return "ie7";
  }
  return undefined;
});
def('wrappIE', function(params, str) {
  if (build.whichIE(params) == 'ie7') {
    return "<!--[if IE 7]>" + str + "<![endif]-->";
  }
  return str;
});
def('paramsToMediaType', function(params) {
  if (_.contains(params, 'screen')) {
    return 'screen';
  }
  if (_.contains(params, 'print')) {
    return 'print';
  }
  return undefined;
});

def('tagifyWithContent', function(file, content) {
  var spaces = file.spaces.slice(2);

  if (!_.contains(file.params, 'compress') || file.type == 'other') {
    content = content.trim().split('\n').map(function(s) {
      return file.spaces + s;
    }).join('\n');
    content = "\n" + content + "\n" + spaces;
  }

  var csstag = helpers.createTag('style', {
    type: 'text/css',
    media: build.paramsToMediaType(file.params),
    'data-path': _.contains(file.params, 'paths') ? file.name : undefined
  }, content);
  var jstag = helpers.createTag('script', {
    type: file.type == 'js' ? 'text/javascript' : 'text/x-opra',
    id: file.type != 'js' && _.contains(file.params, 'ids') ? "opra-" + path.basename(file.name).split('.')[0] : undefined,
    'data-path': _.contains(file.params, 'paths') ? file.name : undefined
  }, content);

  return spaces + build.wrappIE(file.params, file.type == 'css' ? csstag : jstag);
});
def('tagifyWithoutContent', function(file) {
  var isCss = file.type === 'css';
  var css = helpers.createTag('link', { rel: 'stylesheet', type: 'text/css', media: build.paramsToMediaType(file.params), href: file.name });
  var js = helpers.createTag('script', { type: 'text/javascript', src: file.name }, '');
  return file.spaces.slice(2) + build.wrappIE(file.params, isCss ? css : js);
});
def('tagify', function(tags) {
  return tags.map(function(tag) {
    if (_.isUndefined(tag.content)) {
      if (tag.file.type == 'other') {
        return '';
      }
      return build.tagifyWithoutContent(tag.file);
    } else {
      return build.tagifyWithContent(tag.file, tag.content);
    }
  }).filter(function(x) { return x; }).join('\n');
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
          b.files = []
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

def('filesToInline', function(pars, assetRoot, ps, shouldConcat, callback) {
  build.filesToInlineBasic(pars, ps.files, ps.filename, shouldConcat, function(err, data) {
    if (err) {
      callback(err);
      return;
    }

    if (shouldConcat && ps.filename) {
      if (data.length !== 1) {
        callback("Invalid number of files produced while concatenating");
        return;
      }

      var file = data[0].file;
      var content = data[0].content;

      if (ps.fileType != file.type) {
        callback("Invalid filetype! Use 'js' or 'css'.");
        return;
      }

      var outFile = path.join(assetRoot, file.name);

      var tag = build.tagifyWithoutContent(file);
      callback(null, tag, [{ name: outFile, content: content }]);
    } else {
      var dd = build.tagify(data);
      callback(null, dd);
    }
  });
});

var getValueForFirstKeyMatching = function(obj, predicate) {
  var r = Object.keys(obj).filter(predicate);
  return r.length > 0 ? obj[r[0]] : undefined;
}
var allEqual = function(array) {
  var different = false;
  array.map(JSON.stringify).reduce(function(x, y) {
    if (!_.isEqual(x, y)) {
      different = true;
    }
    return y;
  });
  return !different;
};


var fetchFileData = function(file, shouldConcat, outfilename, compiler, callback) {

  var actualCallback = function(err, data) {
    callback(err, { file: file, content: data });
  };

  if (!_.contains(file.params, 'inline') && !(shouldConcat && outfilename)) {
    actualCallback(null, undefined);
  } else {
    var matchingCompiler = getValueForFirstKeyMatching(compiler, function(key) {
      return _.endsWith(file.name, '.' + key);
    });

    if (matchingCompiler) {
      matchingCompiler.compile(file.absolutePath, file.encoding, actualCallback);
    } else {
      fs.readFile(file.absolutePath, file.encoding, actualCallback);
    }
  }
};

var applyEscaping = function(tag) {
  if (_.isUndefined(tag.content)) {
    return tag;
  }
  return {
    file: tag.file,
    content: tag.file.type == 'js' && _.contains(tag.file.params, 'escape') ? helpers.escapeInlineScript(tag.content) : tag.content
  };
};
var applyCompression = function(tag, compressor) {
  if (_.isUndefined(tag.content)) {
    return tag;
  }

  var c = function() {
    if (_.contains(tag.file.params, 'compress')) {
      if (tag.file.type == 'css') {
        return compressor.css(tag.content);
      } else if (tag.file.type == 'js') {
        return compressor.js(tag.content || '');
      }
    }
    return tag.content;
  };

  return {
    file: tag.file,
    content: c()
  };
}


def('filesToInlineBasic', function(pars, files, outfilename, shouldConcat, callback) {
  async.mapSeries(files, function(file, callback) {
    fetchFileData(file, shouldConcat, outfilename, pars.compiler, callback);
  }, function(err, data) {
    if (err) {
      callback(err);
      return;
    }

    data = data.map(applyEscaping).map(function(x) {
      return applyCompression(x, pars.compressor);
    });

    var allIsInline = data.every(function(x) { return _.contains(x.file.params, 'inline'); });

    if (shouldConcat && (outfilename || allIsInline)) {

      var areAllEqual = allEqual(data.map(function(d) {
        return {
          inline: _.contains(d.file.params, 'inline'),
          ie: build.whichIE(d.file.params),
          type: d.file.type,
          media: build.paramsToMediaType(d.file.params)
        };
      }))

      if (!areAllEqual) {
        callback("Concatenation failed; make sure file types, media types and ie-constraints are equivalent within all blocks");
        return;
      }

      if (data.length == 0) {
        callback(null, []);
      } else {
        callback(null, [{
          file: {
            name: outfilename,
            params: data[0].file.params,
            spaces: data[0].file.spaces,
            encoding: 'utf8', // it should be possible to choose this one
            type: data[0].file.type
          },
          content: _.pluck(data, 'content').join(data[0].file.type == 'js' ? ';\n' : '\n')
        }]);
      }
    } else {
      callback(null, data);
    }
  });
});

def('transform', function(assetRoot, pars, encoding, indexFile, matches, content, callback) {
  var hasPreludedCommonJS = false;

  var getNpmFolder = function() {
    var r1 = path.relative(assetRoot, indexFile);
    var r2 = path.join(assetRoot, 'opra-cache', r1);
    var r3 = r2 + '-npm';
    return r3;
  };

  async.reduce(matches, { cont: content, files: [] }, function(cc, d, callback) {
    var next_content = cc.cont;
    var old_outfiles = cc.files;

    var shouldConcat = _.contains(d.params, 'concat');

    var npmreqs = d.files.filter(function(file) {
      return _.contains(file.params, 'npm');
    });

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
      filename: d.filename,
      spaces: d.spaces,
      shouldConcat: shouldConcat,
      fileParams: d.params,
      files: _.flatten(expandedFiles),
      fileType: d.type
    };

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
    }, function() {

      var fc = function(err, data, outfiles) {
        if (err) {
          callback(err);
          return;
        }

        callback(err, {
          cont: helpers.safeReplace(next_content, d.match, data),
          files: old_outfiles.concat(outfiles || [])
        });
      };

      npmreqs.forEach(function(n) {
        var name = n.name;
        n.absolutePath = path.join(getNpmFolder(), name.split('@')[0] + ".js");
        n.name = "/" + path.relative(assetRoot, n.absolutePath);
        n.type = 'js';
        n.encoding = 'utf8';
      });

      build.filesToInline(pars, assetRoot, ps, shouldConcat, fc);
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
            })
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
