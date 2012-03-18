path = require('path')

test 'absolute-paths', {
  'index.html': """
    <html>
      <!--OPRA
        one.js
        /spechelpers/two.js
        ../spechelpers/three.js
      -->
    </html>
  """
  "one.js": ""
  "/spechelpers/two.js": ""
  "../spechelpers/three.js": ""
}, { }, """
  <html>
    <script type="text/javascript" src="one.js"></script>
    <script type="text/javascript" src="/spechelpers/two.js"></script>
    <script type="text/javascript" src="../spechelpers/three.js"></script>
  </html>
""", ['/spechelpers']
