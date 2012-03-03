test 'concat-inline-compressed', {
  'index.html': """
    <html>
      <!--OPRA
        one.js
        two.js
      -->
      <!--OPRA
        one.js
        two.js
        three.css
        two.js
      -->
      <!--OPRA
        one.js
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
}, { inline: true, compress: true, concat: true }, """
  <html>
    <script type="text/javascript">alert(1),2,alert(2)</script>
    <script type="text/javascript">alert(1),2,alert(2)</script>
    <style type="text/css">a{color:red}</style>
    <script type="text/javascript">alert(2)</script>
    <script type="text/javascript">alert(1),2</script>
  </html>
"""
