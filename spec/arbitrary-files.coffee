test 'default-to-inclusion', {
  'index.html': """
    <html>
      <!--OPRA
        one.js
        two.other
        three.tpl
      -->
    </html>
  """
}, {}, """
  <html>
    <script type="text/javascript" src="one.js"></script>
  </html>
"""
