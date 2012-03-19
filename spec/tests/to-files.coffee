path = require("path")

test 'to-files', {
  'index.html': """
    <html>
      <!--OPRA output.js concat
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
    <script type="text/javascript" src="output.js"></script>
  </html>
""", {
  'output.js': """
    alert(1)
    1 + 1;
    alert(2)
  """
}
