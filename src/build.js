var fs = require('fs');
var path = require('path');
var async = require('async');
var _ = require('underscore');

var helpers = require('./helpers.js');
var parse = require('./parse.js');




exports.filetype = function(filename) {
  var compiler = exports.getCompiler();

  return Object.keys(compiler).reduce(function(memo, type) {
    return _.endsWith(filename, '.' + type) ? compiler[type].target : memo;
  }, 'other');
};
exports.resolveIndexFileDir = function(filename) {
  return path.resolve(process.cwd(), path.dirname(filename));
};
exports.filePathToAbsolute = function(filename, assetRoot, indexFileDir) {
  return path.join(helpers.isPathAbsolute(filename) ? assetRoot : indexFileDir, filename);
};
exports.transform = function(assetRoot, pars, encoding, indexFile, matches, content, callback) {



  async.reduce(matches, { cont: content, files: [] }, function(cc, d, callback) {
    var next_content = cc.cont;
    var old_outfiles = cc.files;

    var shouldConcat = _.contains(d.params, 'concat');

    var expandFilters = hooks.expand.concat([function(f, as, index, callback) {
      callback(null, f);
    }]);


    var then = function(expandedFiles) {

      var ps = {
        spaces: d.spaces,
        files: _.flatten(expandedFiles)
      };

      async.forEachSeries(hooks.preproc, function(filt, callback) {
        filt(ps.files, { assetRoot: assetRoot, indexFile: indexFile }, callback);
      }, function(err) {
        if (err) {
          callback(err);
          return;
        }

        exports.filesToStrings(pars, ps.files, {
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

    };

    async.map(d.files, function(file, callback) {
      async.map(expandFilters, function(filter, callback) {
        filter(file, assetRoot, indexFile, callback);
      }, function(err, suggestions) {
        callback(err, _.compact(suggestions).first());
      });
    }, function(err, ex2) {
      // handle error
      then(ex2);
    });

  }, callback);

};
exports.buildConstructor = function(dependencies) {
  return function(indexFile, settings, callback) {

    if (!callback && typeof settings == 'function') {
      callback = settings;
      settings = {};
    }
    settings = settings || {};

    var indexFileDir = exports.resolveIndexFileDir(indexFile);
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

    exports.getCompiler = function() {

      var reader = function(filePath, encoding, assetRoot, callback) {
        fs.readFile(filePath, encoding, callback);
      }

      var compiler = {
        css: {
          target: 'css',
          compile: reader
        },
        js: {
          target: 'js',
          compile: reader
        },
        '.': {
          target: 'other',
          compile: reader
        }
      };

      hooks.compiler.forEach(function(hook) {
        if (compiler[hook.from]) {
          console.log("WARNING - overriding " + hook.from + "-compiler.");
        }
        compiler[hook.from] = {
          target: hook.to,
          compile: hook.compile
        };
      });

      return compiler;
    };


    var autoNumber = 0;

    parse.parseFile(assetRoot, globalFlags, indexFile, encoding, function(err, res) {
      if (err) {
        callback(err);
        return;
      }

      res.matches.forEach(function(match) {
        if (_.contains(match.params, 'concat') && !match.filename) {
          autoNumber++;
          match.filename = '__opra-concat-' + autoNumber;
          match.type = null;
        }
      });

      // Glob-preprocessing
      res.matches.forEach(function(match) {
        match.type = match.type || exports.filetype(match.filename);
        match.files.forEach(function(file) {
          file.absolutePath = exports.filePathToAbsolute(file.name, assetRoot, indexFileDir);
          file.encoding = encoding;
          file.type = exports.filetype(file.name);
          file.globs = file.globs.map(function(x) {
            return {
              name: x,
              params: file.params,
              spaces: file.spaces,
              absolutePath: exports.filePathToAbsolute(x, assetRoot, indexFileDir),
              encoding: encoding,
              type: exports.filetype(x)
            };
          });
        });
      });

      exports.transform(assetRoot, { compiler: null, assetRoot: assetRoot }, encoding, indexFile, res.matches, res.content, function(err, resa) {
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
};
exports.tagify = function(tags) {
  return tags.map(function(tag) {
    var file = tag.file;
    var content = tag.content;

    var tag = "";

    if (_.isUndefined(content)) {
      if (file.type == 'css') {
        tag = {
          name: 'link',
          attributes: { rel: 'stylesheet', type: 'text/css', href: file.name },
          content: null
        };
      } else if (file.type == 'js') {
        tag = {
          name: 'script',
          attributes: { type: 'text/javascript', src: file.name },
          content: ''
        };
      } else {
        return "";
      }
    } else {
      if (file.type == 'css') {
        tag = {
          name: 'style',
          attributes: { type: 'text/css' },
          content: content
        };
      } else if (file.type == 'js') {
        tag = {
          name: 'script',
          attributes: { type: 'text/javascript' },
          content: content
        };
      } else {
        tag = {
          name: 'script',
          attributes: { type: 'text/x-opra' },
          content: content
        };
      }
    }

    tag = hooks.tag.reduce(function(acc, hook) {
      return hook(file, acc);
    }, tag);

    tag = helpers.createTag(tag);

    tag = hooks.postTag.reduce(function(acc, hook) {
      return hook(file, acc);
    }, tag);

    return tag ? file.spaces.slice(2) + tag : '';

  }).filter(function(x) { return x; }).join('\n');
};
exports.filesToStrings = function(deps, files, opraBlock, callback) {

  var getData = function(file, opraBlock, callback) {

    var actualCallback = function(err, data) {
      callback(err, { file: file, content: data });
    };

    var anyTrue = hooks.preventContent.some(function(hook) {
      return hook(file, { shouldConcat: opraBlock.shouldConcat, outfilename: opraBlock.filename });
    });

    if (!anyTrue) {
      actualCallback(null, undefined);
    } else {
      var compiler = exports.getCompiler();
      var matchingCompiler = helpers.getValueForFirstKeyMatching(compiler, function(key) {
        return _.endsWith(file.name, '.' + key);
      });

      if (matchingCompiler) {
        matchingCompiler.compile(file.absolutePath, file.encoding, deps.assetRoot, actualCallback);
      } else {
        compiler['.'].compile(file.absolutePath, file.encoding, deps.assetRoot, actualCallback);
      }
    }
  };




  var extendedFetchers = hooks.fileFetcher.concat([function(file, opraBlock, fetchFileData, callback) {
    var gfiles = file.globs.map(function(x) {
      return _.extend({}, x, {
        params: file.params,
        spaces: file.spaces
      });
    });

    async.mapSeries(gfiles, function(gfile, callback) {
      fetchFileData(gfile, opraBlock, callback);
    }, callback);
  }]);

  async.mapSeries(files, function(file, callback) {
    helpers.firstNonNullSeries(extendedFetchers, function(hook, callback) {
      hook(file, opraBlock, getData, callback);
    }, callback);
  }, function(err, data) {
    if (err) {
      callback(err);
      return;
    }

    data = _.flatten(data);

    data = data.map(function(d) {
      hooks.file.forEach(function(hook) {
        d = hook(d, deps);
      });
      return d;
    });

    helpers.firstNonNullSeries(hooks.data, function(hook, callback) {
      hook(data, opraBlock, hooks.concatable, callback)
    }, function(err, value) {
      if (err) {
        callback(err);
        return;
      }

      if (!value) {
        callback(null, exports.tagify(data));
      } else {
        callback(err, exports.tagify(value.tags), value.outfiles);
      }
    });
  });
};

exports.extend = function(f) {
  var h = {};
  f(h);

  Object.keys(h).forEach(function(key) {
    if (hooks[key]) {
      if (_.isArray(h[key])) {
        hooks[key] = (hooks[key] || []).concat(h[key]);
      } else {
        hooks[key].push(h[key]);
      }
    }
  })
};

var hooks = {
  tag: [],
  postTag: [],
  file: [],
  preventContent: [],
  concatable: [],
  fileFetcher: [],
  data: [],
  preproc: [],
  compiler: [],
  expand: []
};







// Vet inte riktigt var den här hör hemma...
hooks.tag.push(function(file, tag) {
  var spaces = file.spaces.slice(2);


  if (tag.content && (!_.contains(file.params, 'compress') || file.type == 'other')) {
    tag.content = tag.content.trim().split('\n').map(function(s) {
      return file.spaces + s;
    }).join('\n');
    tag.content = "\n" + tag.content + "\n" + spaces;
  }

  // if (tag.content && _.contains(file.params, 'compress') && (file.type == 'js' || file.type == 'css')) {
  //   tag.content = tag.content.trim();
  // }


  return tag;
});
