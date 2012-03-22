var fs = require('fs');
var path = require('path');
var async = require('async');
var cleanCSS = require('clean-css');
var glob = require('glob');
var _ = require('underscore');

var helpers = require('./helpers.js');
var serve = require('./serve.js');
var build = require('./build.js');

var b = build.buildConstructor({ });

exports.build = b;
exports.serve = serve.serveConstructor({
  build: b,
  log: console.log.bind(console)
});
