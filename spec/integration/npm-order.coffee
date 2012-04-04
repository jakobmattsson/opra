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
    <script type="text/javascript" src="/index.html-npm/JSON.js"></script>
    <script type="text/javascript" src="local.js"></script>
    <script type="text/javascript" src="/index.html-npm/underscore.js"></script>
  </html>
""", {
  'index.html-npm/JSON.js': containsText()
  'index.html-npm/underscore.js': containsText()
}
