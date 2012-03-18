path = require('path')

test 'glob', {
  'index.html': """
    <html>
      <!--OPRA
        ../spechelpers/*.js
        /spechelpers/**/*.{js,coffee}
      -->
    </html>
  """
  "/spechelpers/aop1.js": ""
  "/spechelpers/top2.coffee": ""
  "/spechelpers/top3.txt": ""
  "/spechelpers/dir1/dir1.coffee": ""
  "/spechelpers/dir1/dir1.js": ""
  "/spechelpers/dir2/dir2.js": ""
  "/spechelpers/dir2/subdir/subdir.js": ""
}, { assetRoot: path.join(__dirname, '..')  }, """
  <html>
    <script type="text/javascript" src="../spechelpers/aop1.js"></script>
    <script type="text/javascript" src="/spechelpers/aop1.js"></script>
    <script type="text/javascript" src="/spechelpers/dir1/dir1.coffee"></script>
    <script type="text/javascript" src="/spechelpers/dir1/dir1.js"></script>
    <script type="text/javascript" src="/spechelpers/dir2/dir2.js"></script>
    <script type="text/javascript" src="/spechelpers/dir2/subdir/subdir.js"></script>
    <script type="text/javascript" src="/spechelpers/top2.coffee"></script>
  </html>
""", ['/spechelpers']
