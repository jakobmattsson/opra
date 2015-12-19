http = require 'http'
path = require 'path'
connect = require 'connect'
serveStatic = require 'serve-static'
jit = require 'express-jit-coffee'

exports.construct = ({ serve }) ->
  ({ port, root, notFound }, callback) ->
    dir = path.resolve(process.cwd(), root)
    fourofour = if notFound? then path.relative(root, notFound) else null

    app = connect().use(serve(dir)).use(jit(dir)).use(serveStatic(dir))

    if fourofour
      app.use (req, res, next) ->
        if req.headers.accept.indexOf('text/html') != -1 or req.headers.accept.indexOf('*/*') != -1
          req.url = '/' + fourofour
        next()

      app.use(serve(dir))

    http.createServer(app).listen port, ->
      callback(null, { dir, fourofour })
