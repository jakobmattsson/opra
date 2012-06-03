var path = require('path');
var async = require('async');
var _ = require('underscore');

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
exports.createTag = function(tag) {
  var name = tag.name;
  var attributes = tag.attributes || {};
  var content = tag.content;

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
exports.isPathAbsolute = function(filename) {
  return path.resolve(filename) === filename;
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
exports.firstNonNullSeries = function(array, func, callback) {
  var breakObj = {};
  async.forEach(array, function(item, callback) {
    func(item, function(err, value) {
      if (err) {
        callback(err);
        return;
      }
      if (_.isUndefined(value)) {
        callback();
      } else {
        breakObj.value = value;
        callback(breakObj);
      }
    });
  }, function(err) {
    if (err == breakObj) {
      callback(null, breakObj.value);
    } else {
      callback(err);
    }
  });
};
