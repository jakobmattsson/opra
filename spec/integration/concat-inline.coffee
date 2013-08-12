test 'concat-inline', {
  'index.html': """
    <html>
      <!--OPRA
        one.js
        two.js
      -->
      <!--OPRA
        one.js
        two.js
        three.css
        two.js
      -->
      <!--OPRA
        one.js
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
}, { inline: true, concat: true }, error("Concatenation failed; make sure file types, media types and ie-constraints are equivalent within all blocks.\nAlso, make sure you have installed all compilers your code depends on (like less, coffee-script or similar).")