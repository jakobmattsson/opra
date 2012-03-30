test 'compress-inline-exceptions', {
  'index.html': """
    <html>
      <!--OPRA
        one.js
        two.js never-compress
      -->
      <!--OPRA
        three.css
        four.css never-compress
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
  'four.css': """
    a { color: red }
  """
}, { inline: true, compress: true }, """
  <html>
    <script type="text/javascript">alert(1),2</script>
    <script type="text/javascript">
      alert(2)
    </script>
    <style type="text/css">a{color:red}</style>
    <style type="text/css">
      a { color: red }
    </style>
  </html>
"""
