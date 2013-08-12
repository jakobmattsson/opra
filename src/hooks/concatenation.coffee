_ = require 'underscore'
helpers = require '../helpers'
crypto = require 'crypto'

module.exports = (hooks) ->
  hooks.concatable = (file, content) -> file.type

  hooks.preventContent = (file, opraBlock) -> _(opraBlock.params).contains('concat') && opraBlock.filename

  hooks.data = (data, opraBlock, concatable, callback) ->
    if _(opraBlock.params).contains('concat')
      areAllEqual = concatable.every (hook, i) ->
        objs = data.map (d) ->
          hook d.file, d.content
        helpers.allEqual objs

      unless areAllEqual
        callback "Concatenation failed; make sure file types, media types and ie-constraints are equivalent within all blocks.\nAlso, make sure you have installed all compilers your code depends on (like less, coffee-script or similar)."
        return
      if data.length is 0
        callback null,
          tags: ""
      else
        content = _(data).pluck("content").join((if data[0].file.type is "js" then ";\n" else "\n"))
        hashIdentifier = '$HASH'
        hash = if opraBlock.absolutePath.indexOf(hashIdentifier) != -1 then crypto.createHash('md5').update(content).digest("hex").toUpperCase() else null

        dd =
          content: content
          file:
            name: opraBlock.filename.replace(hashIdentifier, hash)
            params: data[0].file.params
            spaces: data[0].file.spaces
            absolutePath: opraBlock.absolutePath.replace(hashIdentifier, hash)
            encoding: "utf8"
            type: data[0].file.type

        if _(opraBlock.params).contains("concat") and opraBlock.filename and not _(dd.file.params).contains("inline")
          callback(null, {
            tags: [{ file: dd.file }]
            outfiles: [
              name: dd.file.absolutePath
              content: dd.content
            ]
          })
        else
          callback null, { tags: [dd] }
    else
      callback()
