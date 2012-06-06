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

    parse.parseFile(assetRoot, globalFlags, indexFile, indexFileDir, encoding, propagate(callback, function(res) {

      res.matches.forEach(function(match) {
        match.type = match.type || exports.filetype(match.filename);
        match.files.forEach(function(file) {
          file.type = exports.filetype(file.name);
          file.globs.forEach(function(x) {
            x.type = exports.filetype(x.name);
          });
        });
      });

      async.reduce(res.matches, { cont: res.content, files: [] }, function(cc, d, callback) {
        async.map(d.files, function(file, callback) {
          async.map(expandFilters, function(filter, callback) {
            filter(file, assetRoot, indexFile, callback);
          }, propagate(callback, function(suggestions) {
            callback(null, _.compact(suggestions).first());
          }));
        }, propagate(callback, function(expandedFiles) {
          async.reduce(hooks.preproc, _.flatten(expandedFiles), function(acca, filt, callback) {
            filt(acca, { assetRoot: assetRoot, indexFile: indexFile }, callback);
          }, propagate(callback, function(outs) {

            var callb = propagate(callback, function(data, outfiles) {
              callback(null, {
                cont: helpers.safeReplace(cc.cont, d.match, data),
                files: cc.files.concat(outfiles || [])
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

              helpers.firstNonNullSeries(hooks.data, function(hook, callback) {
                hook(d2, d, hooks.concatable, callback)
              }, propagate(callb, function(value) {
                if (!value) {
                  callb(null, exports.tagify(d2));
                } else {
                  callb(null, exports.tagify(value.tags), value.outfiles);
                }
              }));
            }));
          }));
        }));
      }, propagate(callback, function(resa) {
        fileSaver(resa.files, encoding, propagate(callback, function() {
          callback(null, resa.cont);
        }));
      }));
    }));
  };
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
