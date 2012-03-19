test 'inline', {
  'index.html': """
    <html>
      <!--OPRA
        one.js
        two.js
      -->
      <!--OPRA
        three.css
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
  'three.css': """
    a { color: red }
  """
}, { inline: true }, """
  <html>
    <script type="text/javascript">
      alert(1)
      1 + 1
    </script>
    <script type="text/javascript">
      alert(2)
    </script>
    <style type="text/css">
      a { color: red }
    </style>
  </html>
"""
