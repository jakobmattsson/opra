var serve = require('./serve.js');
var build = require('./build.js');

var b = build.buildConstructor({ });

exports.build = b;
exports.serve = serve.serveConstructor({
  build: b,
  log: console.log.bind(console)
});
exports.extend = build.extend;

build.extend(require('./hooks/npm.js'));
build.extend(require('./hooks/compression.js'));
build.extend(require('./hooks/conditionalExplorer.js'));
build.extend(require('./hooks/concatenation.js'));
build.extend(require('./hooks/mediaTypes.js'));
build.extend(require('./hooks/tagId.js'));
build.extend(require('./hooks/dataPath.js'));
build.extend(require('./hooks/datauris.js'));
