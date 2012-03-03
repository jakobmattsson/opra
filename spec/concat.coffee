test 'default to include files', {
  'index.html': """
    <html>
      <!--OPRA-SCRIPTS @ foo.js
        one.js
        two.js
      -->
      <!--OPRA-SCRIPTS @ bar.js
        one.js
      -->
      <!--OPRA-STYLES @ c.css screen
        three.css
        four.css @ screen
        five.css @ print
      -->
    </html>
  """
}, {}, """
  <html>
    <script type="text/javascript" src="foo.js"></script>
    <script type="text/javascript" src="bar.js"></script>
    <link rel="stylesheet" type="text/css" media="screen" href="c.css" />
  </html>
"""
