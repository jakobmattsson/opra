var path = require('path');
var _ = require('underscore');

module.exports = function(hooks) {
  hooks.tag = function(file, tag) {
    if (file.type != 'js' && file.type != 'css' && _.contains(file.params, 'ids')) {
      tag.attributes.id = "opra-" + path.basename(file.name).split('.')[0];
    }
    return tag;
  };
};
