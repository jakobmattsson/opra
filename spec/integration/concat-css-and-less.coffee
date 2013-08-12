test 'concat-css-and-less', {
  'index.html': """
    <html>
      <!--OPRA bar.css
        c1.css
        c2.less
      -->
    </html>
  """
  'c1.css': """
    div {
      color: black;
    }
  """
  'c2.less': """
    a {
      color: red;
    }
  """
}, { concat: true },
"""
  <html>
    <link rel="stylesheet" type="text/css" href="bar.css" />
  </html>
""", {
  'bar.css': """
    div {
      color: black;
    }
    a {
      color: red;
    }

  """
}
