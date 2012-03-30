test 'ie7', {
  'index.html': """
    <html>
      <!--OPRA
        one.js
        two.js ie7
      -->
      <!--OPRA
        three.css
        four.css ie7
      -->
    </html>
  """
  "one.js": ""
  "two.js": ""
  "three.css": ""
  "four.css": ""
}, {}, """
  <html>
    <script type="text/javascript" src="one.js"></script>
    <!--[if IE 7]><script type="text/javascript" src="two.js"></script><![endif]-->
    <link rel="stylesheet" type="text/css" href="three.css" />
    <!--[if IE 7]><link rel="stylesheet" type="text/css" href="four.css" /><![endif]-->
  </html>
"""
