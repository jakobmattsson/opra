test 'local-always-params', {
  'index.html': """
    <html>
      <!--OPRA
        one.js
        two.tpl
      -->
      <!--OPRA
        three.css
      -->
      <!--OPRA
        one.js @ always-paths
        two.tpl @ always-ids
      -->
      <!--OPRA
        three.css @ always-compress
      -->
    </html>
  """
  'one.js': """
    alert(1)
    1 + 1
  """
  'two.tpl': """
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
    <script type="text/x-opra">
      alert(2)
    </script>
    <style type="text/css">
      a { color: red }
    </style>
    <script type="text/javascript" data-path="one.js">
      alert(1)
      1 + 1
    </script>
    <script type="text/x-opra" id="opra-two">
      alert(2)
    </script>
    <style type="text/css">a{color:red}</style>
  </html>
"""
