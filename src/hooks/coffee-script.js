var fs = require('fs');
var coffee = require('coffee-script');

module.exports = function(hooks) {
  hooks.compiler = {
    from: 'coffee',
    target: 'js',
    compile: function(filePath, encoding, assetRoot, callback) {
      fs.readFile(filePath, encoding, function(err, content) {
        var code = null;

        if (err) {
          callback(err);
          return;
        }

        try {
          code = coffee.compile(content);
        } catch (e) {
          callback(e);
          return;
        }

        callback(null, code);
      });
    }
  };
};
