test 'arbitrary-files', {
  'index.html': """
    <html>
      <!--OPRA
        one.js
        two.other
        three.tpl
      -->
    </html>
  """
  "one.js": ""
  "two.other": ""
  "three.tpl": ""
}, {}, """
  <html>
    <script type="text/javascript" src="one.js"></script>
  </html>
"""
