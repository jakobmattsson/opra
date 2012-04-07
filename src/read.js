var path = require('path');
var async = require('async');
var _ = require('underscore');
var helpers = require('./helpers.js');

var whichIE = exports.whichIE = function(params) {
  if (_.contains(params, "ie7")) {
    return "ie7";
  }
  return undefined;
};
var wrappIE = exports.wrappIE = function(params, str) {
  if (whichIE(params) == 'ie7') {
    return "<!--[if IE 7]>" + str + "<![endif]-->";
  }
  return str;
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
  var spaces = file.spaces.slice(2);

  if (!_.contains(file.params, 'compress') || file.type == 'other') {
    content = content.trim().split('\n').map(function(s) {
      return file.spaces + s;
    }).join('\n');
    content = "\n" + content + "\n" + spaces;
  }

  var csstag = helpers.createTag('style', {
    type: 'text/css',
    media: exports.paramsToMediaType(file.params),
    'data-path': _.contains(file.params, 'paths') ? file.name : undefined
  }, content);
  var jstag = helpers.createTag('script', {
    type: file.type == 'js' ? 'text/javascript' : 'text/x-opra',
    id: file.type != 'js' && _.contains(file.params, 'ids') ? "opra-" + path.basename(file.name).split('.')[0] : undefined,
    'data-path': _.contains(file.params, 'paths') ? file.name : undefined
  }, content);

  return spaces + exports.wrappIE(file.params, file.type == 'css' ? csstag : jstag);
};
var tagifyWithoutContent = exports.tagifyWithoutContent = function(file) {
  var isCss = file.type === 'css';
  var css = helpers.createTag('link', { rel: 'stylesheet', type: 'text/css', media: exports.paramsToMediaType(file.params), href: file.name });
  var js = helpers.createTag('script', { type: 'text/javascript', src: file.name }, '');
  return file.spaces.slice(2) + exports.wrappIE(file.params, isCss ? css : js);
};
var tagify = exports.tagify = function(tags) {
  return tags.map(function(tag) {
    if (_.isUndefined(tag.content)) {
      if (tag.file.type == 'other') {
        return '';
      }
      return exports.tagifyWithoutContent(tag.file);
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

var filesToInlineBasic = exports.filesToInlineBasic = function(deps, files, opraBlock, callback) {

  async.mapSeries(files, function(file, callback) {
    fetchFileData(file, opraBlock.shouldConcat, opraBlock.filename, deps.compiler, callback);
  }, function(err, data) {
    if (err) {
      callback(err);
      return;
    }

    data = data.map(applyEscaping).map(function(x) {
      return applyCompression(x, deps.compressor);
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

        var tags = _.pluck(data, 'file').map(exports.tagifyWithoutContent);
        var outfiles = data.map(function(d) { return { name: d.file.absolutePath, content: d.content }; });

        callback(null, tags, outfiles);
      } else {
        callback(null, exports.tagify(data));
      }
    });
  });
};
