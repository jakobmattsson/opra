var path = require('path');

exports.requireSource = function(file) {
  return require(path.join(__dirname, '..', process.env.SRC_DIR || 'lib', file));
};
