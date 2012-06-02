var _ = require('underscore');
var helpers = require('../helpers');

module.exports = function(hooks) {

  hooks.concatable = function(file, content) {
    return file.type;
  };

  hooks.data = function(data, opraBlock, concatable, callback) {
    if (opraBlock.shouldConcat) {
      var areAllEqual = concatable.every(function(hook, i) {
        var objs = data.map(function(d) {
          return hook(d.file, d.content);
        });
        return helpers.allEqual(objs);
      })

      if (!areAllEqual) {
        callback("Concatenation failed; make sure file types, media types and ie-constraints are equivalent within all blocks");
        return;
      }

      if (data.length === 0) {
        callback(null, { tags: '' });
      } else {
        var dd = {
          file: {
            name: opraBlock.filename,
            params: data[0].file.params,
            spaces: data[0].file.spaces,
            absolutePath: opraBlock.absolutePath,
            encoding: 'utf8', // it should be possible to choose this one
            type: data[0].file.type
          },
          content: _.pluck(data, 'content').join(data[0].file.type == 'js' ? ';\n' : '\n')
        };

        if (opraBlock.shouldConcat && opraBlock.filename && !_.contains(dd.file.params, 'inline')) {
          callback(null, { tags: [{ file: dd.file }], outfiles: [{ name: dd.file.absolutePath, content: dd.content }] });
        } else {
          callback(null, { tags: [dd] });
        }
      }
    } else {
      callback();
    }
  };
};
