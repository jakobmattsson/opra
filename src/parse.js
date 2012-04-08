var fs = require('fs');
var path = require('path');
var async = require('async');
var glob = require('glob');
var _ = require('underscore');
var _s = require('underscore.string');
var helpers = require('./helpers.js');

_.mixin(require('underscore.string').exports());

var resolveIndexFileDir = exports.resolveIndexFileDir = function(filename) {
  return path.resolve(process.cwd(), path.dirname(filename));
};
var filePathToAbsolute = exports.filePathToAbsolute = function(filename, assetRoot, indexFileDir) {
  var basePath = helpers.isPathAbsolute(filename) ? assetRoot : indexFileDir;
  return helpers.isPathAbsolute(filename) ? '/' + path.relative(basePath, filename) : filename;
};
var getMatches = exports.getMatches = function(content, prefix, postfix) {
  var reg = new RegExp(" *" + prefix + "( +[^\n]*)?\n([^>]*)" + postfix, "g");

  return helpers.execAll(reg, content).map(function(x) {
    return {
      str: x[0],
      params: _.compact((x[1] || '').split(' '))
    };
  }).map(function(matchData) {
    var filename;

    var filenames = matchData.params.filter(function(p) {
      return _s.contains(p, '.');
    });
    matchData.params = matchData.params.filter(function(p) {
      return !_s.contains(p, '.');
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
        var data = _.compact(s.split(' ').map(function(p) { return p.trim(); }));
        return {
          name: data[0],
          params: data.slice(1),
          spaces: s.match(/^\s*/)[0] || ''
        };
      })
    };
  });
};
var globMatches = exports.globMatches = function(assetRoot, indexFileDir, matches, callback) {
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

        callback(null, _.extend({}, file, {
          globs: globbedFiles.map(function(globbedFile) {
            return filePathToAbsolute(globbedFile, assetRoot, indexFileDir).replace(/\\/g, "/");
          })
        }));
      });
    }, function(err, result) {
      callback(err, _.extend({}, match, {
        files: result
      }));
    });
  }, callback);
};
var globber = exports.globber = function(pattern, root, cwd, callback) {
  glob(pattern, { nonull: false, root: root, cwd: cwd }, callback);
};
var flagMatches = exports.flagMatches = function(matches, globalFlags) {

  var prec = function(params, indirect, n, scope) {
    if (_.contains(params, 'always-' + n) && _.contains(params, 'never-' + n)) {
      throw new Error('"always" and "never" assigned to the same ' + scope);
    } else if (_.contains(params, 'always-' + n)) {
      return n;
    } else if (_.contains(params, 'never-' + n)) {
      return undefined;
    } else if (_.contains(indirect, 'always-' + n)) {
      return n;
    } else if (_.contains(indirect, 'never-' + n)) {
      return undefined;
    } else if (!_.isUndefined(globalFlags) && !_.isUndefined(globalFlags[n])) {
      return globalFlags[n] ? n : undefined;
    } else if (_.contains(params, n) || _.contains(indirect, n)) {
      return n;
    }
    return undefined;
  };
  var subprec = function(files, indirect, prefixes) {
    return (files || []).map(function(file) {
      return _.extend({}, file, {
        params: _.compact(fileParams.map(function(n) {
          return prec(file.params || [], indirect || [], n, 'file');
        })).concat((file.params || []).filter(function(x) {
          return filePrefixes.some(function(fp) {
            return _.startsWith(x, fp + ':');
          });
        }))
      });
    });
  };

  var blockParams = ['concat'].sort();
  var fileParams = ['compress', 'datauris', 'paths', 'ids', 'escape', 'screen', 'ie7', 'print', 'npm', 'inline'].sort();
  var filePrefixes = ['as'];

  return matches.map(function(m) {
    return _.extend({}, m, {
      params: _.compact(blockParams.map(function(n) {
        return prec(m.params || [], [], n, 'block');
      })),
      files: subprec(m.files, m.params, filePrefixes)
    });
  });
};
var parseFile = exports.parseFile = function(assetRoot, globalFlags, indexFile, encoding, callback) {
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
};
