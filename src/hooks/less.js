var fs = require('fs');
var path = require('path');
var less = require('less');

module.exports = function(hooks) {
  hooks.compiler = {
    from: 'less',
    to: 'css',
    compile: function(filePath, encoding, assetRoot, callback) {
      fs.readFile(filePath, encoding, function(err, content) {
        if (err) {
          callback(err);
          return;
        }
        less.render(content, { paths: [assetRoot, path.dirname(filePath)] }, callback);
      });
    }
  };
};
