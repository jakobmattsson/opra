test 'concat-invalid-filename', {
  'index.html': """
    <html>
      <!--OPRA foo.apa
        f1.js
        f2.js
      -->
      <!--OPRA bar.js
        f1.js
      -->
    </html>
  """
  'f1.js': """
    alert(1)
  """
  'f2.js': """
    alert(1 + 1)
  """
  'c1.css': """
    color: black;
  """
  'c2.css': """
    color: red;
  """
}, { concat: true }, """
  <html>
    <script type="text/javascript" src="foo.apa"></script>
    <script type="text/javascript" src="bar.js"></script>
  </html>
""", {
  'foo.apa': """
    alert(1);
    alert(1 + 1)
  """
  'bar.js': """
    alert(1)
  """
}
