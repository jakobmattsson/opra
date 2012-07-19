_ = require("underscore")
escapeInlineScript = (script) ->
  script.replace /<\/( )*script>/g, (str) ->
    str.replace "</", "\\x3C/"

module.exports = (hooks) ->
  hooks.preventContent = (file, opraBlock) ->
    _.contains file.params, "inline"

  hooks.concatable = (file, content) ->
    _.contains file.params, "inline"

  hooks.file = (tag) ->
    return tag  if _.isUndefined(tag.content)
    file: tag.file
    content: (if tag.file.type is "js" and _.contains(tag.file.params, "escape") then escapeInlineScript(tag.content) else tag.content)
