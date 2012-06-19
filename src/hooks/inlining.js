var _ = require('underscore');

// Inlining (detta är allt, men anledningen till att det funkar är att koden i princip är skriven för "default" inlining. Kanske kan bryta ut de sakerna mer ovan.)

var escapeInlineScript = function(script) {
  return script.replace(/<\/( )*script>/g, function(str) {
    return str.replace("</", "\\x3C/");
  });
};


module.exports = function(hooks) {
  hooks.preventContent = function(file, opraBlock) {
    return _.contains(file.params, 'inline');
  };
  hooks.concatable = function(file, content) {
    return _.contains(file.params, 'inline');
  };
  hooks.file = function(tag) {
    if (_.isUndefined(tag.content)) {
      return tag;
    }
    return {
      file: tag.file,
      content: tag.file.type == 'js' && _.contains(tag.file.params, 'escape') ? escapeInlineScript(tag.content) : tag.content
    };
  };
};




