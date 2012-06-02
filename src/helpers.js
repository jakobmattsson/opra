var fs = require('fs');
var path = require('path');
var less = require('less');
var coffee = require('coffee-script');
var _ = require('underscore');

exports.compileCoffee = function(filePath, encoding, callback) {
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
};
exports.compileLess = function(filePath, paths, encoding, callback) {
  fs.readFile(filePath, encoding, function(err, content) {
    if (err) {
      callback(err);
      return;
    }
    less.render(content, { paths: paths.concat([path.dirname(filePath)]) }, callback);
  });
};
exports.safeReplace = function(str, target, newString) {
  var i = str.indexOf(target);
  if (i === -1) {
    return str;
  }
  return str.slice(0, i) + newString + str.slice(i + target.length);
};
exports.safeReplaceAll = function(str, target, newString) {
  while (true) {
    var i = str.indexOf(target);

    if (i === -1) {
      return str;
    }

    str = str.slice(0, i) + newString + str.slice(i + target.length);
  }
};
exports.execAll = function(regexp, str) {
  var match;
  var matches = [];

  while ((match = regexp.exec(str)) !== null) {
    matches.push(match);
  }

  return matches;
};
exports.createTag = function(name, attributes, content) {
  attributes = attributes || {};

  if (_.isUndefined(content) && typeof attributes === 'string') {
    content = attributes;
    attributes = {};
  }

  return "<" + name + Object.keys(attributes).filter(function(key) {
    return !_.isUndefined(attributes[key]);
  }).map(function(key) {
    return " " + key + '="' + attributes[key] + '"';
  }).join('') + (typeof content == 'string' ? ">" + content + "</" + name + ">" : " />");
};
exports.createTagData = function(name, attributes, content) {
  return { name: name, attributes: attributes || {}, content: content };
};
exports.createTagFromData = function(data) {
  return exports.createTag(data.name, data.attributes, data.content);
};

exports.isPathAbsolute = function(filename) {
  return path.resolve(filename) === filename;
};
exports.escapeInlineScript = function(script) {
  return script.replace(/<\/( )*script>/g, function(str) {
    return str.replace("</", "\\x3C/");
  });
};
exports.getValueForFirstKeyMatching = function(obj, predicate) {
  var r = Object.keys(obj).filter(predicate);
  return r.length > 0 ? obj[r[0]] : undefined;
};
exports.allEqual = function(array) {
  var different = false;
  array.map(JSON.stringify).reduce(function(x, y) {
    if (!_.isEqual(x, y)) {
      different = true;
    }
    return y;
  });
  return !different;
}
