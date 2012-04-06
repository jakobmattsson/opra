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
}, { concat: true }, error("Invalid filetype! Use 'js' or 'css'.")
