path = require('path')

test 'absolute-paths-assetRoot', {
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
  "one.js": ''
  "spechelpers/aop1.js": ''
  "/spechelpers/aop1.js": ''
}, { assetRoot: path.join(__dirname, '..') }, """
  <html>
    <script type="text/javascript" src="one.js"></script>
    <script type="text/javascript" src="spechelpers/aop1.js"></script>
    <script type="text/javascript" src="/spechelpers/aop1.js"></script>
    <script type="text/javascript" src="../spechelpers/aop1.js"></script>
  </html>
""", ['/spechelpers']
