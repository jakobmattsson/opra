path = require 'path'
async = require 'async'
_ = require 'underscore'

exports.safeReplace = (str, target, newString) ->
  i = str.indexOf(target)
  return str if i == -1
  return str.slice(0, i) + newString + str.slice(i + target.length)

exports.safeReplaceAll = (str, target, newString) ->
  while true
    i = str.indexOf(target)
    return str if i == -1
    str = str.slice(0, i) + newString + str.slice(i + target.length)

exports.execAll = (regexp, str) ->
  matches = []

  while true
    match = regexp.exec(str)
    break if match == null
    matches.push(match)

  matches

exports.createTag = (tag) ->
  name = tag.name
  attributes = tag.attributes || {}
  content = tag.content

  if _.isUndefined(content) && typeof attributes == 'string'
    content = attributes
    attributes = {}

  return "<" + name + Object.keys(attributes).filter (key) ->
    !_.isUndefined(attributes[key])
  .map (key) ->
    " " + key + '="' + attributes[key] + '"'
  .join('') + (if (typeof content == 'string') then ">" + content + "</" + name + ">" else " />")

exports.isPathAbsolute = (filename) ->
  path.resolve(filename) == filename

exports.getValueForFirstKeyMatching = (obj, predicate) ->
  r = Object.keys(obj).filter(predicate)
  if r.length > 0 then obj[r[0]] else undefined

exports.allEqual = (array) ->
  different = false
  array.map(JSON.stringify).reduce (x, y) ->
    different = true if !_.isEqual(x, y)
    y
  !different

exports.firstNonNullSeries = (array, func, callback) ->
  breakObj = {}
  async.forEachSeries array, (item, callback) ->
    func item, (err, value) ->
      return callback(err) if err

      if _.isUndefined(value)
        callback()
      else
        breakObj.value = value
        callback(breakObj)

  , (err) ->
    if err == breakObj
      callback(null, breakObj.value)
    else
      callback(err)
