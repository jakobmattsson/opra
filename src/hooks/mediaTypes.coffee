_ = require("underscore")
paramsToMediaType = (params) ->
  return "screen"  if _.contains(params, "screen")
  return "print"  if _.contains(params, "print")
  `undefined`

module.exports = (hooks) ->
  hooks.tag = (file, tag) ->
    media = paramsToMediaType(file.params)
    if media
      return _.extend({}, tag,
        attributes: _.extend({}, tag.attributes,
          media: media
        )
      )
    tag

  hooks.concatable = (file, content) ->
    paramsToMediaType file.params
