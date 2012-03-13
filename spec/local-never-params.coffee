test 'local-never-params', {
  'index.html': """
    <html>
      <!--OPRA
        one.tpl
        two.js
      -->
      <!--OPRA
        three.css
      -->
      <!--OPRA
        one.tpl @ never-ids
        two.js @ never-paths
      -->
      <!--OPRA
        three.css @ never-compress
      -->
    </html>
  """
  'one.tpl': """
    alert(1)
    1 + 1
  """
  'two.js': """
    alert(2)
  """
  'three.css': """
    a { color: red }
  """
}, { paths: true, compress: true, ids: true, inline: true }, """
  <html>
    <script type="text/x-opra" id="one.tpl" data-path="one.tpl">
      alert(1)
      1 + 1
    </script>
    <script type="text/javascript" data-path="two.js">alert(2)</script>
    <style type="text/css" data-path="three.css">a{color:red}</style>
    <script type="text/x-opra" data-path="one.tpl">
      alert(1)
      1 + 1
    </script>
    <script type="text/javascript">alert(2)</script>
    <style type="text/css" data-path="three.css">
      a { color: red }
    </style>
  </html>
"""
