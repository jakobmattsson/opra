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
  var tag = undefined;
  
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
      tag = undefined;
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
  
  callback(null, tag);
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
exports.resolveIndexFileDir = function(filename) {
  return path.resolve(process.cwd(), path.dirname(filename));
};


exports.tagify = function(tags, callback) {
  async.map(tags, function(tag, callback) {
    var file = tag.file;
    var content = tag.content;

    var tagCreators = (hooks.tagCreator || []).concat([defaultTagCreator]);

    helpers.firstNonNullSeries(tagCreators, function(hook, callback) {
      hook(file, content, callback);
    }, function(err, tag) {


      if (_.isUndefined(tag)) {
        callback(null, "");
        return;
      }

      tag = hooks.tag.reduce(function(acc, hook) {
        return hook(file, acc);
      }, tag);

      tag = helpers.createTag(tag);

      tag = hooks.postTag.reduce(function(acc, hook) {
        return hook(file, acc);
      }, tag);
      
      callback(null, tag ? file.spaces.slice(2) + tag : '');
    });

  }, function(err, res) {
    callback(err, res.filter(function(x) { return x; }).join('\n'));
  });
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
            hook(acca, {assetRoot: assetRoot, indexFile: indexFile }, callback);
          }, propagate(callback, function(outs) {

            var callb = propagate(callback, function(result) {
              callback(null, {
                cont: helpers.safeReplace(cc.cont, d.match, result.data),
                files: cc.files.concat(result.outfiles || [])
              });
            });

            async.mapSeries(outs, function(file, callback) {
              helpers.firstNonNullSeries(extendedFetchers, function(hook, callback) {
                hook(file, d, getData, callback);
              }, callback);
            }, propagate(callb, function(data) {

              var d2 = reduceArray(_.flatten(data), hooks.file, function(acc, hook) {
                return hook(acc);
              });

              helpers.firstNonNullSeries(extendedDataHooks, function(hook, callback) {
                hook(d2, d, hooks.concatable, callback)
              }, propagate(callb, function(out) {
                
                exports.tagify(out.tags, function(err, data) {
                  callb(null, {
                    data: data,
                    outfiles: out.outfiles
                  });
                });
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
