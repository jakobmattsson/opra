test 'arbitrary-files-inline', {
  'index.html': """
    <html>
      <!--OPRA
        one.js
        some/two.other
        three.tpl
      -->
    </html>
  """
  'one.js': """
    alert(1)
    1 + 1
  """
  'some/two.other': """
    hello world
  """
  'three.tpl': """
    <div>test</div>
  """
}, { inline: true, paths: true }, """
  <html>
    <script type="text/javascript" data-path="one.js">
      alert(1)
      1 + 1
    </script>
    <script type="text/x-opra" data-path="some/two.other">
      hello world
    </script>
    <script type="text/x-opra" data-path="three.tpl">
      <div>test</div>
    </script>
  </html>
"""
