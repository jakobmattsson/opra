test 'default-to-inclusion', {
  'index.html': """
    <html>
      <!--OPRA
        one.js
        two.js
      -->
      <!--OPRA
        three.css
        four.css @ screen
        five.css @ print
      -->
    </html>
  """
  "one.js": ""
  "two.js": ""
  "three.css": ""
  "four.css": ""
  "five.css": ""
}, {}, """
  <html>
    <script type="text/javascript" src="one.js"></script>
    <script type="text/javascript" src="two.js"></script>
    <link rel="stylesheet" type="text/css" href="three.css" />
    <link rel="stylesheet" type="text/css" media="screen" href="four.css" />
    <link rel="stylesheet" type="text/css" media="print" href="five.css" />
  </html>
"""
