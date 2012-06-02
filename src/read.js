var path = require('path');
var async = require('async');
var _ = require('underscore');
var helpers = require('./helpers.js');

var tagHooks = [];
var postTagHooks = [];
var fileHooks = [];


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


fileHooks.push(function(file, deps) {
  return applyEscaping(file);
});
fileHooks.push(function(file, deps) {
  return applyCompression(file, deps.compressor);
});


















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
    if (_.isUndefined(tag.content)) {
      return exports.tagifyWithContent(tag.file);
    } else {
      return exports.tagifyWithContent(tag.file, tag.content);
    }
  }).filter(function(x) { return x; }).join('\n');
};

var fetchFileData = exports.fetchFileData = function(file, shouldConcat, outfilename, compiler, callback) {

  var actualCallback = function(err, data) {
    callback(err, { file: file, content: data });
  };

  if (!_.contains(file.params, 'inline') && !(shouldConcat && outfilename)) {
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
var applyEscaping = exports.applyEscaping = function(tag) {
  if (_.isUndefined(tag.content)) {
    return tag;
  }
  return {
    file: tag.file,
    content: tag.file.type == 'js' && _.contains(tag.file.params, 'escape') ? helpers.escapeInlineScript(tag.content) : tag.content
  };
};
var applyCompression = exports.applyCompression = function(tag, compressor) {
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
};
var stuffs = exports.stuffs = function(data, opraBlock, callback) {
  var allIsInline = data.every(function(x) { return _.contains(x.file.params, 'inline'); });

  if (opraBlock.shouldConcat && (opraBlock.filename || allIsInline)) {

    var areAllEqual = helpers.allEqual(data.map(function(d) {
      return {
        inline: _.contains(d.file.params, 'inline'),
        ie: whichIE(d.file.params),
        type: d.file.type,
        media: exports.paramsToMediaType(d.file.params)
      };
    }));

    if (!areAllEqual) {
      callback("Concatenation failed; make sure file types, media types and ie-constraints are equivalent within all blocks");
      return;
    }

    if (data.length === 0) {
      callback(null, []);
    } else {
      callback(null, [{
        file: {
          name: opraBlock.filename,
          params: data[0].file.params,
          spaces: data[0].file.spaces,
          absolutePath: opraBlock.absolutePath,
          encoding: 'utf8', // it should be possible to choose this one
          type: data[0].file.type
        },
        content: _.pluck(data, 'content').join(data[0].file.type == 'js' ? ';\n' : '\n')
      }]);
    }
  } else {
    callback(null, data);
  }
};

// Tar ett opra-block och returnerar två saker:
// * Koden som ska stoppas in i HTML-filen
// * En lista med filer [{ content: string, name: string }] som ska skapas
var filesToInlineBasic = exports.filesToInlineBasic = function(deps, files, opraBlock, callback) {

  async.mapSeries(files, function(file, callback) {

    if (_.contains(file.params, 'npm')) {
      fetchFileData(file, opraBlock.shouldConcat, opraBlock.filename, deps.compiler, callback);
    } else {

      var gfiles = file.globs.map(function(x) {
        return _.extend({}, x, {
          params: file.params,
          spaces: file.spaces
        });
      });

      async.mapSeries(gfiles, function(gfile, callback) {
        fetchFileData(gfile, opraBlock.shouldConcat, opraBlock.filename, deps.compiler, callback);
      }, function(err, data) {
        callback(err, data);
      });
    }
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

    stuffs(data, opraBlock, function(err, data) {
      if (err) {
        callback(err);
        return;
      }

      if (opraBlock.shouldConcat && opraBlock.filename) {
        if (data.some(function(d) { return opraBlock.fileType != d.file.type; })) {
          callback("Invalid filetype! Use 'js' or 'css'.");
          return;
        }

        var tags = _.pluck(data, 'file').map(function(f) {
          return exports.tagifyWithContent(f);
        });
        var outfiles = data.map(function(d) { return { name: d.file.absolutePath, content: d.content }; });

        callback(null, tags, outfiles);
      } else {
        callback(null, exports.tagify(data));
      }
    });
  });
};
