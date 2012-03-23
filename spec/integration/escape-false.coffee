test 'escape-false', {
  'index.html': """
    <html>
      <!--OPRA
        one.js
        two.js
      -->
      <!--OPRA
        three.css
      -->
    </html>
  """
  'one.js': """
    alert(1)
    1 + 1
    alert("This is not a closing script tag </scr ipt>");
  """
  'two.js': """
    alert("This is a closing script tag </script>");
  """
  'three.css': """
    a { color: red }
    b { background-image: url("</script>"); }
  """
}, { inline: true, escape: false }, """
  <html>
    <script type="text/javascript">
      alert(1)
      1 + 1
      alert("This is not a closing script tag </scr ipt>");
    </script>
    <script type="text/javascript">
      alert("This is a closing script tag </script>");
    </script>
    <style type="text/css">
      a { color: red }
      b { background-image: url("</script>"); }
    </style>
  </html>
"""
