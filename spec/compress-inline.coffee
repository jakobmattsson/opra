test 'inline = true and compress = true', {
  'index.html': """
    <html>
      <!--OPRA-SCRIPTS
        one.js
        two.js
      -->
      <!--OPRA-STYLES
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
}, { inline: true, compress: true }, """
  <html>
    <script type="text/javascript">alert(1),2</script>
    <script type="text/javascript">alert(2)</script>
    <style type="text/css" media="all">a{color:red}</style>
  </html>
"""
