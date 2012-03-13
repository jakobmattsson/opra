test 'global-params', {
  'index.html': """
    <html>
      <!--OPRA
        one.js
      -->
      <!--OPRA inline
        one.js
        two.js
      -->
      <!--OPRA inline concat
        one.js
        two.js
      -->
      <!--OPRA script.js concat
        one.js
        two.js
      -->
    </html>
  """
  'one.js': """
    alert(1)
    1 + 1
  """
  'two.js': """
    alert(2)
  """
}, { }, """
  <html>
    <script type="text/javascript" src="one.js"></script>
    <script type="text/javascript">
      alert(1)
      1 + 1
    </script>
    <script type="text/javascript">
      alert(2)
    </script>
    <script type="text/javascript">
      alert(1)
      1 + 1
      alert(2)
    </script>
    <script type="text/javascript" src="script.js"></script>
  </html>
"""
