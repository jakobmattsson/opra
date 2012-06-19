var _ = require('underscore');

module.exports = function(hooks) {
  hooks.tag = function(file, tag) {
    if (_.contains(file.params, 'paths')) {
      tag.attributes['data-path'] = file.name
    }
    return tag;
  };
};
