test 'inline-ids', {
  'index.html': """
    <html>
      <!--OPRA
        one.js
        two.js
      -->
      <!--OPRA
        three.css
        path/four.tpl
        five
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
  'path/four.tpl': """
    template code...
  """
  'five': """
    more template code...
  """
}, { inline: true, ids: true }, """
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
    <script type="text/x-opra" id="four.tpl">
      template code...
    </script>
    <script type="text/x-opra" id="five">
      more template code...
    </script>
  </html>
"""
