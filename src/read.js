var path = require('path');
var async = require('async');
var _ = require('underscore');
var helpers = require('./helpers.js');

var tagHooks = [];
var postTagHooks = [];
var fileHooks = [];
var preventContentHooks = [];
var concatableHooks = [];
var fileFetcherHooks = [];


var whichIE = exports.whichIE = function(params) {
  if (_.contains(params, "ie7")) {
    return "ie7";
  }
  return undefined;
};
var paramsToMediaType = exports.paramsToMediaType = function(params) {
  if (_.contains(params, 'screen')) {
    return 'screen';
  }
  if (_.contains(params, 'print')) {
    return 'print';
  }
  return undefined;
};


tagHooks.push(function(file, tag) {
  var spaces = file.spaces.slice(2);


  if (tag.content && (!_.contains(file.params, 'compress') || file.type == 'other')) {
    tag.content = tag.content.trim().split('\n').map(function(s) {
      return file.spaces + s;
    }).join('\n');
    tag.content = "\n" + tag.content + "\n" + spaces;
  }

  return tag;
});
tagHooks.push(function(file, tag) {
  var media = exports.paramsToMediaType(file.params);
  if (media) {
    tag.attributes.media = media;
  }
  return tag;
});
tagHooks.push(function(file, tag) {
  if (file.type != 'js' && file.type != 'css' && _.contains(file.params, 'ids')) {
    tag.attributes.id = "opra-" + path.basename(file.name).split('.')[0];
  }
  return tag;
});
tagHooks.push(function(file, tag) {
  if (_.contains(file.params, 'paths')) {
    tag.attributes['data-path'] = file.name
  }
  return tag;
});


postTagHooks.push(function(file, tag) {
  if (whichIE(file.params) == 'ie7') {
    return "<!--[if IE 7]>" + tag + "<![endif]-->";
  }
  return tag;
});


fileHooks.push(function(tag, deps) {
  if (_.isUndefined(tag.content)) {
    return tag;
  }
  return {
    file: tag.file,
    content: tag.file.type == 'js' && _.contains(tag.file.params, 'escape') ? helpers.escapeInlineScript(tag.content) : tag.content
  };
});
fileHooks.push(function(tag, deps) {
  var compressor = deps.compressor;

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
});


preventContentHooks.push(function(file, blockParams) {
  return _.contains(file.params, 'inline');
});
preventContentHooks.push(function(file, blockParams) {
  return blockParams.shouldConcat && blockParams.outfilename;
});


concatableHooks.push(function(file, content) {
  return paramsToMediaType(file.params);
});
concatableHooks.push(function(file, content) {
  return _.contains(file.params, 'inline');
});
concatableHooks.push(function(file, content) {
  return whichIE(file.params);
});
concatableHooks.push(function(file, content) {
  return file.type;
});


fileFetcherHooks.push(function(file, opraBlock, deps, callback) {
  if (_.contains(file.params, 'npm')) {
    fetchFileData(file, opraBlock, deps.compiler, callback);
  } else {
    callback();
  }
});




var tagifyWithContent = exports.tagifyWithContent = function(file, content) {

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
      tag = helpers.createTagData('style', {
        type: 'text/css',
      }, content);
    } else if (file.type == 'js') {
      tag = helpers.createTagData('script', {
        type: 'text/javascript'
      }, content);
    } else {
      tag = helpers.createTagData('script', {
        type: 'text/x-opra'
      }, content);
    }
  }

  tagHooks.forEach(function(hook) {
    tag = hook(file, tag);
  });

  tag = helpers.createTagFromData(tag);

  postTagHooks.forEach(function(hook) {
    tag = hook(file, tag);
  });

  return tag ? file.spaces.slice(2) + tag : '';
};
var tagify = exports.tagify = function(tags) {
  return tags.map(function(tag) {
    return exports.tagifyWithContent(tag.file, tag.content);
  }).filter(function(x) { return x; }).join('\n');
};

var fetchFileData = exports.fetchFileData = function(file, opraBlock, compiler, callback) {

  var shouldConcat = opraBlock.shouldConcat
  var outfilename = opraBlock.filename;

  var actualCallback = function(err, data) {
    callback(err, { file: file, content: data });
  };

  var anyTrue = preventContentHooks.some(function(hook) {
    return hook(file, { shouldConcat: shouldConcat, outfilename: outfilename });
  });

  if (!anyTrue) {
    actualCallback(null, undefined);
  } else {
    var matchingCompiler = helpers.getValueForFirstKeyMatching(compiler, function(key) {
      return _.endsWith(file.name, '.' + key);
    });

    if (matchingCompiler) {
      matchingCompiler.compile(file.absolutePath, file.encoding, actualCallback);
    } else {
      compiler['.'].compile(file.absolutePath, file.encoding, actualCallback);
    }
  }
};




// Denna ska läggas sist i hook-listan, som en inbyggd default så att säga.
fileFetcherHooks.push(function(file, opraBlock, deps, callback) {
  var gfiles = file.globs.map(function(x) {
    return _.extend({}, x, {
      params: file.params,
      spaces: file.spaces
    });
  });

  async.mapSeries(gfiles, function(gfile, callback) {
    fetchFileData(gfile, opraBlock, deps.compiler, callback);
  }, callback);
});



var filesToInlineBasic = exports.filesToInlineBasic = function(deps, files, opraBlock, callback) {

  async.mapSeries(files, function(file, callback) {
    helpers.firstNonNullSeries(fileFetcherHooks, function(hook, callback) {
      hook(file, opraBlock, deps, callback);
    }, function(err, value) {
      callback(err, value);
    });
  }, function(err, data) {
    if (err) {
      callback(err);
      return;
    }

    data = _.flatten(data);

    data = data.map(function(d) {
      fileHooks.forEach(function(hook) {
        d = hook(d, deps);
      });
      return d;
    });


    if (opraBlock.shouldConcat) {

      var areAllEqual = concatableHooks.every(function(hook, i) {
        var objs = data.map(function(d) {
          return hook(d.file, d.content);
        });
        return helpers.allEqual(objs);
      })

      if (!areAllEqual) {
        callback("Concatenation failed; make sure file types, media types and ie-constraints are equivalent within all blocks");
        return;
      }

      if (data.length === 0) {
        callback(null, exports.tagify(data));
      } else {
        data = [{
          file: {
            name: opraBlock.filename,
            params: data[0].file.params,
            spaces: data[0].file.spaces,
            absolutePath: opraBlock.absolutePath,
            encoding: 'utf8', // it should be possible to choose this one
            type: data[0].file.type
          },
          content: _.pluck(data, 'content').join(data[0].file.type == 'js' ? ';\n' : '\n')
        }];

        if (opraBlock.shouldConcat && opraBlock.filename && !_.contains(data[0].file.params, 'inline')) {
          var tags = _.pluck(data, 'file').map(function(f) {
            return exports.tagifyWithContent(f);
          });
          var outfiles = data.map(function(d) {
            return {
              name: d.file.absolutePath,
              content: d.content
            };
          });

          callback(null, tags, outfiles);
        } else {
          callback(null, exports.tagify(data));
        }


      }
    } else {
      callback(null, exports.tagify(data));
    }
  });
};
