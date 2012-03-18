test 'compress', {
  'index.html': """
    <html>
      <!--OPRA

        # comment

        one.js # another comment
        two.js

        # three.js
      -->
      <!--OPRA
        three.css
      -->
    </html>
  """
  "one.js": ""
  "two.js": ""
  "three.css": ""
}, { compress: true }, """
  <html>
    <script type="text/javascript" src="one.js"></script>
    <script type="text/javascript" src="two.js"></script>
    <link rel="stylesheet" type="text/css" href="three.css" />
  </html>
"""
