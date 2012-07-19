_ = require("underscore")
whichIE = (params) ->
  return "ie7"  if _.contains(params, "ie7")
  `undefined`

module.exports = (hooks) ->
  hooks.postTag = (file, tag) ->
    return "<!--[if IE 7]>" + tag + "<![endif]-->"  if whichIE(file.params) is "ie7"
    tag

  hooks.concatable = (file, content) ->
    whichIE file.params
