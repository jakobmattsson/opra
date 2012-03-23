path = require('path')

files = {
  'index.html': """
    <html>
      <!--OPRA
        one.js
        spechelpers/aop1.js
        /spechelpers/aop1.js
        ../spechelpers/aop1.js
      -->
    </html>
  """
  "one.js": """
    1
  """
  "spechelpers/aop1.js": """
    2
  """
  "/spechelpers/aop1.js": """
    top1.js
  """
}

test 'absolute-paths-inline', files, { inline: true, assetRoot: path.resolve(__dirname, '../..') }, """
  <html>
    <script type="text/javascript">
      1
    </script>
    <script type="text/javascript">
      2
    </script>
    <script type="text/javascript">
      top1.js
    </script>
    <script type="text/javascript">
      top1.js
    </script>
  </html>
""", {
 '/spechelpers': null
}
