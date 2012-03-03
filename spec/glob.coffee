test 'glob', {
  'index.html': """
    <html>
      <!--OPRA
        one.js
        specfiles/**/*.{js,coffee}
      -->
    </html>
  """
}, {}, """
  <html>
    <script type="text/javascript" src="one.js"></script>
    <script type="text/javascript" src="specfiles/aop1.js"></script>
    <script type="text/javascript" src="specfiles/dir1/dir1.coffee"></script>
    <script type="text/javascript" src="specfiles/dir1/dir1.js"></script>
    <script type="text/javascript" src="specfiles/dir2/dir2.js"></script>
    <script type="text/javascript" src="specfiles/dir2/subdir/subdir.js"></script>
    <script type="text/javascript" src="specfiles/top2.coffee"></script>
  </html>
"""
