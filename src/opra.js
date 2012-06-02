var serve = require('./serve.js');
var build = require('./build.js');

var b = build.buildConstructor({ });

exports.build = b;
exports.serve = serve.serveConstructor({
  build: b,
  log: console.log.bind(console)
});
exports.extend = build.extend;



(function() {
  var _ = require('underscore');
  var cleanCSS = require('clean-css');
  var uglify = require('uglify-js');

  exports.extend(function(hooks) {
    hooks.file = function(tag, deps) {

      var compressor = {
        css: function(code, callback) {
          return cleanCSS.process(code);
        },
        js: function(code, callback) {
          return uglify(code || '');
        }
      };

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
  });

}());

