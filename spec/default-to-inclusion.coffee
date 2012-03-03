test 'default to include files', {
  'index.html': """
    <html>
      <!--OPRA-SCRIPTS
        one.js
        two.js
      -->
      <!--OPRA-STYLES
        three.css
        four.css @ screen
        five.css @ print
      -->
    </html>
  """
}, {}, """
  <html>
    <script type="text/javascript" src="one.js"></script>
    <script type="text/javascript" src="two.js"></script>
    <link rel="stylesheet" type="text/css" media="all" href="three.css" />
    <link rel="stylesheet" type="text/css" media="screen" href="four.css" />
    <link rel="stylesheet" type="text/css" media="print" href="five.css" />
  </html>
"""
