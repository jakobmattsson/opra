test 'npm', {
  'index.html': """
    <html>
      <!--OPRA npm
        JSON
        underscore@1.1.0
      -->
    </html>
  """
}, { }, """
  <html>
    <script type="text/javascript" src="/opra-cache/index.html-npm/JSON.js"></script>
    <script type="text/javascript" src="/opra-cache/index.html-npm/underscore.js"></script>
  </html>
""", {
  'opra-cache/index.html-npm/JSON.js': containsText('var require = function', 'require.define("/node_modules/JSON/json2.js"')
  'opra-cache/index.html-npm/underscore.js': containsText('require.define("/node_modules/underscore/package.json"', "_.VERSION = '1.1.0'")
  'opra-cache/index.html-npm/JSON.version': ''
  'opra-cache/index.html-npm/underscore.version': '1.1.0'
}
