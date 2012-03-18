test 'concat', {
  'index.html': """
    <html>
      <!--OPRA foo.js
        f1.js
        f2.js
      -->
      <!--OPRA bar.js
        f1.js
      -->
      <!--OPRA c.css
        c1.css
        c2.css
        c1.css
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
    <script type="text/javascript" src="foo.js"></script>
    <script type="text/javascript" src="bar.js"></script>
    <link rel="stylesheet" type="text/css" href="c.css" />
  </html>
""", {
  'bar.js': """
    alert(1)
  """
  'c.css': """
    color: black;
    color: red;
    color: black;
  """
  'foo.js': """
    alert(1);
    alert(1 + 1)
  """
}
