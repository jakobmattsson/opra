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
var parse = require('./parse.js');
var build = exports;

var def = function(name, func) {
  // this[name] = func;
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
  if (helpers.contains(params, "ie7")) {
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

  if (!helpers.contains(tag.file.params, 'compress') || tag.file.type == 'other') {
    tag.content = tag.content.trim().split('\n').map(function(s) {
      return tag.file.spaces + s;
    }).join('\n');
    tag.content = "\n" + tag.content + "\n" + spaces;
  }

  var csstag = helpers.createTag('style', {
    type: 'text/css',
    media: build.paramsToMediaType(tag.file.params),
    'data-path': helpers.contains(tag.file.params, 'paths') ? tag.file.name : undefined
  }, tag.content);
  var jstag = helpers.createTag('script', {
    type: tag.file.type == 'js' ? 'text/javascript' : 'text/x-opra',
    id: tag.file.type != 'js' && helpers.contains(tag.file.params, 'ids') ? "opra-" + path.basename(tag.file.name).split('.')[0] : undefined,
    'data-path': helpers.contains(tag.file.params, 'paths') ? tag.file.name : undefined
  }, tag.content);

  return spaces + build.wrappIE(tag.file.params, tag.file.type == 'css' ? csstag : jstag);
});
def('tagify', function(tags) {
  return tags.map(build.tagifyOne).join('\n');
});

def('resolveIndexFileDir', function(filename) {
  return path.resolve(process.cwd(), path.dirname(filename));
});
def('resolveIndexFile', function(filename) {
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
  var delayedCallback = _.after(2, callback);

  build.buildNPM(filename, [d], first, function(err, data) {
    if (err) {
      callback(err);
      return;
    }

    var aliasFile = aliases.map(function(alias) {
      return "window['" + alias + "'] = require('" + packageName + "');";
    }).join('\n');

    if (aliasFile) {
      fs.writeFile(path.join(filename, packageName + "-require.js"), aliasFile, 'utf8', delayedCallback);
    } else {
      delayedCallback();
    }

    fs.writeFile(path.join(filename, packageName + ".js"), data, 'utf8', delayedCallback);
  });
});

def('filesToMultipleInclude', function(files, compiler, callback) {
  var result = files.filter(function(file) {
    return file.type != 'other';
  }).map(function(file) {
    var isCss = file.type === 'css';
    var css = helpers.createTag('link', { rel: 'stylesheet', type: 'text/css', media: build.paramsToMediaType(file.params), href: file.name });
    var js = helpers.createTag('script', { type: 'text/javascript', src: file.name }, '');
    return file.spaces.slice(2) + build.wrappIE(file.params, isCss ? css : js);
  }).join('\n');
  callback(null, result);
});
def('filesToInline', function(compiler, files, shouldConcat, callback) {
  build.filesToInlineBasic(compiler, files, shouldConcat, function(err, data) {
    if (err) {
      callback(err);
      return;
    }
    callback(null, build.tagify(data));
  });
});
def('filesToInlineBasic', function(compiler, files, shouldConcat, callback) {
  async.mapSeries(files, function(file, callback) {

    var actualCallback = function(err, data) {
      callback(err, { file: file, content: data });
    };

    var compileType = Object.keys(compiler).filter(function(type) {
      return _.endsWith(file.name, '.' + type);
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

    data = data.map(function(d) {
      return {
        file: d.file,
        content: d.file.type == 'js' && helpers.contains(d.file.params, 'escape') ? helpers.escapeInlineScript(d.content) : d.content
      };
    }).map(function(d) {
      return {
        file: d.file,
        content: build.compressor(d.file.type, d.file.params, d.content)
      };
    });

    if (shouldConcat) {

      var hasError = false;
      data.map(function(d) {
        return JSON.stringify({
          ie: build.whichIE(d.file.params),
          type: d.file.type,
          media: build.paramsToMediaType(d.file.params)
        });
      }).reduce(function(x, y) {
        if (!_.isEqual(x, y)) {
          hasError = true;
        }
        return y;
      });
      if (hasError) {
        callback("Concatenation failed; make sure file types, media types and ie-constraints are equivalent within all blocks");
        return;
      }

      if (data.length == 0) {
        callback(null, []);
      } else {
        callback(null, [{
          file: data[0].file,
          spaces: data.map(function(x) { return x.file.spaces; }),
          content: _.pluck(data, 'content').join(_.endsWith(data[0].file.name, '.js') ? ';\n' : '\n')
        }]);
      }
    } else {
      callback(null, data);
    }
  });
});
def('concatToFiles', function(compiler, assetRoot, ps, callback) {
  var filename = ps.filename;
  var spaces = ps.spaces;
  var ft = ps.fileType;

  build.filesToInlineBasic(compiler, ps.files, true, function(err, data) {
    if (err) {
      callback(err);
      return;
    }
    if (data.length !== 1) {
      callback("Invalid number of files produced while concatenating");
      return;
    }

    var outFile = path.join(assetRoot, filename);
    var content = data[0].content; //compressor(ft, data[0].file.params, data[0].content);

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

def('transform', function(assetRoot, compiler, encoding, indexFile, matches, content, callback) {
  var hasPreludedCommonJS = false;

  async.reduce(matches, { cont: content, files: [] }, function(cc, d, callback) {
    var next_content = cc.cont;
    var old_outfiles = cc.files;

    var shouldConcat = helpers.contains(d.params, 'concat');

    var npmreqs = d.files.filter(function(file) {
      return helpers.contains(file.params, 'npm');
    });

    var expandedFiles = d.files.map(function(file) {
      if (helpers.contains(file.params, 'npm') && file.params.some(function(p) { return _.startsWith(p, 'as:'); })) {
        var abs = path.join(indexFile + "-npm", file.name.split('@')[0] + "-require.js");
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
      build.filesFromNPM(!hasPreludedCommonJS, assetRoot, item.name, indexFile + "-npm", aliases, function(err) {
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
        n.absolutePath = path.join(indexFile + "-npm", name.split('@')[0] + ".js");
        n.name = "/" + path.relative(assetRoot, n.absolutePath);
        n.type = 'js';
        n.encoding = 'utf8';
      });

      if (helpers.contains(d.params, 'inline')) {
        build.filesToInline(compiler, ps.files, shouldConcat, fc);
      } else if (shouldConcat && d.filename) {
        build.concatToFiles(compiler, assetRoot, ps, fc);
      } else {
        build.filesToMultipleInclude(ps.files, compiler, fc);
      }

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

    parse.parseFile(assetRoot, globalFlags, indexFile, encoding, function(err, res) {
      if (err) {
        callback(err);
        return;
      }

      // some ugly preprocessing in order to merge globbed files with non-globbed
      res.matches.forEach(function(m) {
        m.files = _.flatten(m.files.map(function(file) {
          if (!helpers.contains(file.params, 'npm')) {
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

      build.transform(assetRoot, compiler, encoding, indexFile, res.matches, res.content, function(err, resa) {
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
