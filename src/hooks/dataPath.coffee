_ = require 'underscore'

module.exports = (hooks) ->
  hooks.tag = (file, tag) ->
    tag.attributes["data-path"] = file.name if _(file.params).contains("paths")
    tag
