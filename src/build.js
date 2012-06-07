var fs = require('fs');
var path = require('path');
var async = require('async');
var _ = require('underscore');

var helpers = require('./helpers.js');
var parse = require('./parse.js');


var propagate = function(callback, func) {
  return function(err) {
    if (err) {
      callback(err);
      return;
    }
    return func.apply(this, Array.prototype.slice.call(arguments, 1));
  };
};
var reduceArray = function(seeds, reducers, transform) {
  return seeds.map(function(seed) {
    return reducers.reduce(transform, seed);
  });
};
var fileSaver = function(files, defaultEncoding, callback) {
  async.forEach(files || [], function(file, callback) {
    fs.writeFile(file.name, file.content, file.encoding || defaultEncoding, callback);
  }, callback);
};
var resolveFileDir = function(filename) {
  return path.resolve(process.cwd(), path.dirname(filename));
};



var defaultExpand = function(f, as, index, callback) {
  callback(null, f);
};
var defaultFetcher = function(file, opraBlock, fetchFileData, callback) {
  var gfiles = file.globs.map(function(x) {
    return _.extend({}, x, {
      params: file.params,
      spaces: file.spaces
    });
  });

  async.mapSeries(gfiles, function(gfile, callback) {
    fetchFileData(gfile, opraBlock, callback);
  }, callback);
};
var defaultSomething = function(data, opraBlock, concatable, callback) {
  callback(null, { tags: data });
};
var defaultTagCreator = function(file, content, callback) {
  if (_.isUndefined(content)) {
    callback();
  } else {
    callback(null, {
      name: 'script',
      attributes: { type: 'text/x-opra' },
      content: content
    });
  }
};


exports.getFileTypes = function() {
  var compiler = exports.getCompiler();
  return Object.keys(compiler).reduce(function(memo, type) {
    memo[type] = compiler[type].target;
    return memo;
  }, {
    js: 'js',
    css: 'css',
  });
};
exports.getCompiler = function() {
  var compiler = { };

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
exports.filetype = function(filename) {
  var fts = exports.getFileTypes();
  return Object.keys(fts).reduce(function(memo, from) {
    return _.endsWith(filename, '.' + from) ? fts[from] : memo;
  }, 'other');
};






exports.buildConstructor = function(dependencies) {
  return function(indexFile, settings, callback) {

    if (!callback && typeof settings == 'function') {
      callback = settings;
      settings = {};
    }
    settings = settings || {};

    var indexFileDir = resolveFileDir(indexFile);
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

    var expandFilters = hooks.expand.concat([defaultExpand]);
    var extendedFetchers = hooks.fileFetcher.concat([defaultFetcher]);
    var extendedDataHooks = hooks.data.concat([defaultSomething]);

    var addTypes = function(res) {
      return res.map(function(match) {
        return _.extend({}, match, {
          type: match.type || exports.filetype(match.filename),
          files: match.files.map(function(file) {
            return _.extend({}, file, {
              type: exports.filetype(file.name),
              globs: file.globs.map(function(x) {
                return _.extend({}, x, {
                  type: exports.filetype(x.name)
                })
              })
            })
          })
        })
      })
    }
    var getData = function(file, opraBlock, callback) {

      var actualCallback = function(err, data) {
        callback(err, { file: file, content: data });
      };

      var anyTrue = hooks.preventContent.some(function(hook) {
        return hook(file, opraBlock);
      });

      if (!anyTrue) {
        actualCallback(null, undefined);
        return;
      }

      var matchingCompiler = helpers.getValueForFirstKeyMatching(exports.getCompiler(), function(key) {
        return _.endsWith(file.name, '.' + key);
      });

      if (matchingCompiler) {
        matchingCompiler.compile(file.absolutePath, file.encoding, assetRoot, actualCallback);
      } else {
        fs.readFile(file.absolutePath, file.encoding, actualCallback);
      }
    };
    var tagify = function(tags, callback) {
      var tagCreators = (hooks.tagCreator || []).concat([defaultTagCreator]);
      async.map(tags, function(intag, callback) {
        helpers.firstNonNullSeries(tagCreators, function(hook, callback) {
          hook(intag.file, intag.content, callback);
        }, propagate(callback, function(tag) {
          if (_.isUndefined(tag)) {
            callback(null, "");
            return;
          }

          tag = hooks.tag.reduce(function(acc, hook) {
            return hook(intag.file, acc);
          }, tag);

          tag = helpers.createTag(tag);

          tag = hooks.postTag.reduce(function(acc, hook) {
            return hook(intag.file, acc);
          }, tag);

          tag = tag ? intag.file.spaces.slice(2) + tag : '';

          callback(null, tag);
        }));

      }, propagate(callback, function(res) {
        callback(null, res.filter(function(x) { return x; }).join('\n'));
      }));
    };

    parse.parseFile(assetRoot, globalFlags, indexFile, indexFileDir, encoding, propagate(callback, function(parseResult) {
      async.reduce(addTypes(parseResult.matches), { cont: parseResult.content, files: [] }, function(cc, d, callback) {
        async.map(d.files, function(file, callback) {
          async.map(expandFilters, function(hook, callback) {
            hook(file, assetRoot, indexFile, callback);
          }, propagate(callback, function(suggestions) {
            callback(null, _.compact(suggestions).first());
          }));
        }, propagate(callback, function(expandedFiles) {
          async.reduce(hooks.preproc, _.flatten(expandedFiles), function(acca, hook, callback) {
            hook(acca, { assetRoot: assetRoot, indexFile: indexFile }, callback);
          }, propagate(callback, function(outs) {
            async.mapSeries(outs, function(file, callback) {
              helpers.firstNonNullSeries(extendedFetchers, function(hook, callback) {
                hook(file, d, getData, callback);
              }, callback);
            }, propagate(callback, function(data) {
              var d2 = reduceArray(_.flatten(data), hooks.file, function(acc, hook) {
                return hook(acc);
              });
              helpers.firstNonNullSeries(extendedDataHooks, function(hook, callback) {
                hook(d2, d, hooks.concatable, callback)
              }, propagate(callback, function(out) {
                tagify(out.tags, propagate(callback, function(data) {
                  callback(null, {
                    cont: helpers.safeReplace(cc.cont, d.match, data),
                    files: cc.files.concat(out.outfiles || [])
                  });
                }));
              }));
            }));
          }));
        }));
      }, propagate(callback, function(r) {
        fileSaver(r.files, encoding, propagate(callback, function() {
          callback(null, r.cont);
        }));
      }));
    }));
  };
};

exports.extend = function(f) {
  var h = {};
  f(h);

  Object.keys(h).forEach(function(key) {
    hooks[key] = hooks[key] || [];
    if (_.isArray(h[key])) {
      hooks[key] = hooks[key].concat(h[key]);
    } else {
      hooks[key].push(h[key]);
    }
  })
};

var hooks = { };







// Vet inte riktigt var den här hör hemma...
hooks.tag = [];
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
