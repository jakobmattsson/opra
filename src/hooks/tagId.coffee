path = require("path")
_ = require("underscore")
module.exports = (hooks) ->
  hooks.tag = (file, tag) ->
    tag.attributes.id = "opra-" + path.basename(file.name).split(".")[0]  if file.type isnt "js" and file.type isnt "css" and _.contains(file.params, "ids")
    tag
