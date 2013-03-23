test 'ie8', {
  'index.html': """
    <html>
      <!--OPRA
        one.js
        two.js ie8
      -->
      <!--OPRA
        three.css
        four.css ie8
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
    <!--[if IE 8]><script type="text/javascript" src="two.js"></script><![endif]-->
    <link rel="stylesheet" type="text/css" href="three.css" />
    <!--[if IE 8]><link rel="stylesheet" type="text/css" href="four.css" /><![endif]-->
  </html>
"""
