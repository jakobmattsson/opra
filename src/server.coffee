http = require 'http'
path = require 'path'
connect = require 'connect'
jit = require 'express-jit-coffee'

exports.construct = ({ serve }) ->
  ({ port, root, notFound }) ->
    dir = path.resolve(process.cwd(), root)
    fourofour = if notFound? then path.relative(root, notFound) else null

    app = connect().use(serve(dir)).use(jit(dir)).use(connect.static(dir))

    if fourofour
      app.use (req, res, next) ->
        if req.headers.accept.indexOf('text/html') != -1
          req.url = '/' + fourofour
        next()

      app.use(serve(dir))

    http.createServer(app).listen(port)
    { dir, fourofour }