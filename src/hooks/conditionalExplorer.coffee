_ = require("underscore")

versions = [6, 7, 8, 9]

whichIE = (params) ->
  matches = versions.filter (v) -> _(params).contains("ie" + v)
  "ie" + matches[0] if matches.length > 0

module.exports = (hooks) ->
  hooks.concatable = (file, content) -> whichIE(file.params)
  hooks.postTag = (file, tag) ->
    matches = versions.filter (v) -> _(file.params).contains("ie" + v)
    if matches.length == 0 then tag else "<!--[if IE #{matches[0]}]>#{tag}<![endif]-->"
