path = require('path')

test 'glob', {
  'index.html': """
    <html>
      <!--OPRA
        one.js
        spechelpers/**/*.{js,coffee}
      -->
    </html>
  """
}, {  }, """
  <html>
    <script type="text/javascript" src="one.js"></script>
    <script type="text/javascript" src="spechelpers/aop1.js"></script>
    <script type="text/javascript" src="spechelpers/dir1/dir1.coffee"></script>
    <script type="text/javascript" src="spechelpers/dir1/dir1.js"></script>
    <script type="text/javascript" src="spechelpers/dir2/dir2.js"></script>
    <script type="text/javascript" src="spechelpers/dir2/subdir/subdir.js"></script>
    <script type="text/javascript" src="spechelpers/top2.coffee"></script>
  </html>
"""
