var fs = require('fs');
var path = require('path');
var async = require('async');
var cleanCSS = require('clean-css');
var glob = require('glob');
var powerfs = require('powerfs');
var _ = require('underscore');
var uglify = require('uglify-js');

var helpers = require('./helpers.js');
var parse = require('./parse.js');
var read = require('./read.js');
var filters = require('./filters.js');
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




def('transform', function(assetRoot, pars, encoding, indexFile, matches, content, callback) {



  async.reduce(matches, { cont: content, files: [] }, function(cc, d, callback) {
    var next_content = cc.cont;
    var old_outfiles = cc.files;

    var shouldConcat = _.contains(d.params, 'concat');

    var expandFilters = filters.expandFilters.concat([function(f, as, index, callback) {
      callback(null, f);
    }]);


    var then = function(expandedFiles) {

      var ps = {
        spaces: d.spaces,
        files: _.flatten(expandedFiles)
      };

      async.forEachSeries(filters.preprocFilters, function(filt, callback) {
        filt(ps.files, { assetRoot: assetRoot, indexFile: indexFile }, callback);
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

      // Glob-preprocessing
      res.matches.forEach(function(match) {
        match.type = build.filetype(match.filename, compiler);
        match.files.forEach(function(file) {
          file.absolutePath = build.filePathToAbsolute(file.name, assetRoot, indexFileDir);
          file.encoding = encoding;
          file.type = build.filetype(file.name, compiler);
          file.globs = file.globs.map(function(x) {
            return {
              name: x,
              params: file.params,
              spaces: file.spaces,
              absolutePath: build.filePathToAbsolute(x, assetRoot, indexFileDir),
              encoding: encoding,
              type: build.filetype(x, compiler)
            };
          });
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
