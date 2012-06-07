var serve = require('./serve.js');
var build = require('./build.js');

var b = build.buildConstructor({ });

exports.build = b.build;
exports.serve = serve.serveConstructor({
  build: b.build,
  log: console.log.bind(console)
});
exports.extend = b.extend;

exports.extend(require('./hooks/javascript.js'));
exports.extend(require('./hooks/css.js'));
exports.extend(require('./hooks/inlining.js'));
exports.extend(require('./hooks/npm.js'));
exports.extend(require('./hooks/compression.js'));
exports.extend(require('./hooks/conditionalExplorer.js'));
exports.extend(require('./hooks/concatenation.js'));
exports.extend(require('./hooks/mediaTypes.js'));
exports.extend(require('./hooks/tagId.js'));
exports.extend(require('./hooks/dataPath.js'));
exports.extend(require('./hooks/datauris.js'));
exports.extend(require('./hooks/less.js'));
exports.extend(require('./hooks/coffee-script.js'));
