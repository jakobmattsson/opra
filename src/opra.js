var serve = require('./serve.js');
var build = require('./build.js');

var b = build.buildConstructor({ });

exports.build = b;
exports.serve = serve.serveConstructor({
  build: b,
  log: console.log.bind(console)
});
