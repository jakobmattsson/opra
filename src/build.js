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

var getNpmFolder = function(assetRoot, indexFile) {
  var r1 = path.relative(assetRoot, indexFile);
  var r2 = path.join(assetRoot, '.opra-cache', r1);
  var r3 = r2 + '-npm';
  return r3;
};

var expandNPM = function(getNpmFolder, file, assetRoot, indexFile) {
  if (_.contains(file.params, 'npm') && file.params.some(function(p) { return _.startsWith(p, 'as:'); })) {

    var abs = path.join(getNpmFolder(assetRoot, indexFile), file.name.split('@')[0] + "-require.js");
    var reqFile = {
      absolutePath: abs,
      name: "/" + path.relative(assetRoot, abs),
      type: 'js',
      encoding: 'utf8',
      spaces: file.spaces,
      params: _.without(file.params, 'npm')
    };
    return [file, reqFile];
  }
};


def('transform', function(assetRoot, pars, encoding, indexFile, matches, content, callback) {



  async.reduce(matches, { cont: content, files: [] }, function(cc, d, callback) {
    var next_content = cc.cont;
    var old_outfiles = cc.files;

    var shouldConcat = _.contains(d.params, 'concat');

    var expandedFiles = d.files.map(function(file) {
      var f2 = expandNPM(getNpmFolder, file, assetRoot, indexFile);
      if (f2) {
        return f2;
      }
      return [file];
    });

    var ps = {
      spaces: d.spaces,
      files: _.flatten(expandedFiles)
    };

    async.forEachSeries([filters.filter2, filters.filter1, filters.filter3], function(filt, callback) {
      filt(ps.files, { assetRoot: assetRoot, indexFile: indexFile, getNpmFolder: getNpmFolder }, callback);
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
