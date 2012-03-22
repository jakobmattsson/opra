var fs = require('fs');
var path = require('path');
var coffee = require('coffee-script');
var less = require('less');
var uglify = require('uglify-js');
var _ = require('underscore');

var def = function(name, func) {
  this[name] = func;
  exports[name] = func;
};

def('compileCoffee', function(filePath, encoding, callback) {
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
});
def('compileLess', function(filePath, paths, encoding, callback) {
  fs.readFile(filePath, encoding, function(err, content) {
    if (err) {
      callback(err);
      return;
    }
    less.render(content, { paths: paths.concat([path.dirname(filePath)]) }, callback);
  });
});
def('uglifier', function(code) {
  var jsp = uglify.parser;
  var pro = uglify.uglify;

  var ast = jsp.parse(code);
  ast = pro.ast_mangle(ast);
  ast = pro.ast_squeeze(ast);
  return pro.gen_code(ast);
});
def('endsWith', function(str, ends) {
  return ends.some(function(end) {
    return end == str.slice(-end.length);
  });
});
def('safeReplace', function(str, target, newString) {
  var i = str.indexOf(target);
  return str.slice(0, i) + newString + str.slice(i + target.length);
});
def('safeReplaceAll', function(str, target, newString) {
  while (true) {
    var i = str.indexOf(target);

    if (i === -1) {
      return str;
    }

    str = str.slice(0, i) + newString + str.slice(i + target.length);
  }
});
def('execAll', function(regexp, str) {
  var match;
  var matches = [];

  while ((match = regexp.exec(str)) != null) {
    matches.push(match);
  }

  return matches;
});
def('removeIndex', function(array, index) {
  var a = array.slice(0);
  a.splice(index, 1);
  return a;
});
def('removeElement', function(array, element) {
  var i = array.indexOf(element);
  if (i !== -1) {
    return removeIndex(array, i);
  }
  return array;
});
def('arrayContains', function(array, element) {
  return array.indexOf(element) !== -1;
});
def('createTag', function(name, attributes, content) {
  return "<" + name + Object.keys(attributes).filter(function(key) {
    return !_.isUndefined(attributes[key]);
  }).map(function(key) {
    return " " + key + '="' + attributes[key] + '"';
  }).join('') + (typeof content == 'string' ? ">" + content + "</" + name + ">" : " />");
});
def('isPathAbsolute', function(filename) {
  return path.resolve(filename) === filename;
});
def('escapeInlineScript', function(script) {
  return script.replace(/<\/( )*script>/g, function(str) {
    return str.replace("</", "\\x3C/");
  });
});
