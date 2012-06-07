var fs = require('fs');
var path = require('path');
var less = require('less');
var _ = require('underscore');

module.exports = function(hooks) {
  hooks.tagCreator = function(file, content, callback) {
    if (file.type == 'css') {
      if (_.isUndefined(content)) {
        callback(null, {
          name: 'link',
          attributes: { rel: 'stylesheet', type: 'text/css', href: file.name },
          content: null
        });
      } else {
        callback(null, {
          name: 'style',
          attributes: { type: 'text/css' },
          content: content
        });
      }
    } else {
      callback();
    }
  }

  hooks.compiler = {
    from: 'css',
    target: 'css',
    compile: function(filePath, encoding, assetRoot, callback) {
      fs.readFile(filePath, encoding, callback);
    }
  };
};
