var fs = require('fs');
var path = require('path');
var less = require('less');
var _ = require('underscore');

module.exports = function(hooks) {
  hooks.tagCreator = function(file, content, callback) {
    if (file.type == 'js') {
      if (_.isUndefined(content)) {
        callback(null, {
          name: 'script',
          attributes: { type: 'text/javascript', src: file.name },
          content: ''
        });
      } else {
        callback(null, {
          name: 'script',
          attributes: { type: 'text/javascript' },
          content: content
        });
      }
    } else {
      callback();
    }
  }
};
