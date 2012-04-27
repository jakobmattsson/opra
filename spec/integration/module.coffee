path = require('path')

files = {
  'index.html': """
    <html>
      <!--OPRA
        underscore@1.1.0 npm
        one.js module inline
        one.js inline
      -->
    </html>
  """
  "one.js": "exports.square = function(x) { return x * x; };"
}

test 'module', files, { }, """
  <html>
    <script type="text/javascript" src="/.opra-cache/index.html-npm/underscore.js"></script>
    <script type="text/javascript">
      require.define('one.js', function(require, module, exports, __dirname, __filename) {
        exports.square = function(x) { return x * x; };
      });
    </script>
    <script type="text/javascript">
      exports.square = function(x) { return x * x; };
    </script>
  </html>
"""