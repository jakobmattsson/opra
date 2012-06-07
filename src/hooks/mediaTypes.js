var _ = require('underscore');

var paramsToMediaType = function(params) {
  if (_.contains(params, 'screen')) {
    return 'screen';
  }
  if (_.contains(params, 'print')) {
    return 'print';
  }
  return undefined;
};

module.exports = function(hooks) {
  hooks.tag = function(file, tag) {
    var media = paramsToMediaType(file.params);
    if (media) {
      return _.extend({}, tag, {
        attributes: _.extend({}, tag.attributes, { media: media })
      });
    }
    return tag;
  };
  hooks.concatable = function(file, content) {
    return paramsToMediaType(file.params);
  };
};
