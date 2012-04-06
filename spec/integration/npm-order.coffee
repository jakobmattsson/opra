test 'npm-order', {
  'index.html': """
    <html>
      <!--OPRA
        JSON npm
        local.js
        underscore@1.1.0 npm
      -->
    </html>
  """
  'local.js': """
    alert(1)
  """
}, { }, """
  <html>
    <script type="text/javascript" src="/opra-cache/index.html-npm/JSON.js"></script>
    <script type="text/javascript" src="local.js"></script>
    <script type="text/javascript" src="/opra-cache/index.html-npm/underscore.js"></script>
  </html>
""", {
  'opra-cache/index.html-npm/JSON.js': containsText()
  'opra-cache/index.html-npm/underscore.js': containsText()
  'opra-cache/index.html-npm/JSON.version': ''
  'opra-cache/index.html-npm/underscore.version': '1.1.0'
}
