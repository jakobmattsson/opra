test 'type-detection-include', {
  'index.html': """
    <html>
      <!--OPRA
        one.css
        one.js
        one.coffee
        one.less @ screen
      -->
    </html>
  """
}, { }, """
  <html>
    <link rel="stylesheet" type="text/css" href="one.css" />
    <script type="text/javascript" src="one.js"></script>
    <script type="text/javascript" src="one.coffee"></script>
    <link rel="stylesheet" type="text/css" media="screen" href="one.less" />
  </html>
"""