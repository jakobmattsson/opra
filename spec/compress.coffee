test 'compress = true', {
  'index.html': """
    <html>
      <!--OPRA-SCRIPTS

        # comment

        one.js # another comment
        two.js

        # three.js
      -->
      <!--OPRA-STYLES
        three.css
      -->
    </html>
  """
}, { compress: true }, """
  <html>
    <script type="text/javascript" src="one.js"></script>
    <script type="text/javascript" src="two.js"></script>
    <link rel="stylesheet" type="text/css" media="all" href="three.css" />
  </html>
"""
