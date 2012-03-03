test 'default to include files', {
  'index.html': """
    <html>
      <!--OPRA-SCRIPTS
        one.js
        two.js @ ie7
      -->
      <!--OPRA-STYLES
        three.css
        four.css @ ie7
      -->
    </html>
  """
}, {}, """
  <html>
    <script type="text/javascript" src="one.js"></script>
    <!--[if IE 7]><script type="text/javascript" src="two.js"></script><![endif]-->
    <link rel="stylesheet" type="text/css" media="all" href="three.css" />
    <!--[if IE 7]><link rel="stylesheet" type="text/css" media="all" href="four.css" /><![endif]-->
  </html>
"""
