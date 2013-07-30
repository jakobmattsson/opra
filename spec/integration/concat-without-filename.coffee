test 'concat-without-filename', {
  'index.html': """
    <html>
      <!--OPRA inline concat
        one.js
        two.coffee
      -->
      <!--OPRA inline concat
        one.css
        two.css
      -->
    </html>
  """
  'one.js': """
    alert(1)
    1 + 1
  """
  'two.coffee': """
    alert(2)
  """
  'one.css': """
    div { color: green }
  """
  'two.css': """
    div { color: red }
  """
}, { inline: false }, """
  <html>
    <script type="text/javascript" src="__opra-concat-1"></script>
    <link rel="stylesheet" type="text/css" href="__opra-concat-2" />
  </html>
""", {
  '__opra-concat-1': [
    """
      alert(1)
      1 + 1;
      (function() {
        alert(2);
      
      }).call(this);

    """
  ,
    """
      alert(1)
      1 + 1;
      (function() {

        alert(2);

      }).call(this);

    """
  ,
    """
      alert(1)
      1 + 1;
      (function() {
        alert(2);

      }).call(this);
    """
  ]
  '__opra-concat-2': """
    div { color: green }
    div { color: red }
  """
}
