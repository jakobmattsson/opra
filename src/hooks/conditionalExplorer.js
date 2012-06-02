var _ = require('underscore');

var whichIE = function(params) {
  if (_.contains(params, "ie7")) {
    return "ie7";
  }
  return undefined;
};

module.exports = function(hooks) {
  hooks.postTag = function(file, tag) {
    if (whichIE(file.params) == 'ie7') {
      return "<!--[if IE 7]>" + tag + "<![endif]-->";
    }
    return tag;
  };

  hooks.concatable = function(file, content) {
    return whichIE(file.params);
  };
};
