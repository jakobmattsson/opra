test 'funcational-params-as-stronger', {
  'index.html': """
    <html>
      <!--OPRA
        one.js
      -->
      <!--OPRA inline
        one.js
        two.js
      -->
      <!--OPRA file.js inline concat
        one.js
        two.js
      -->
      <!--OPRA script.js concat
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
}, { inline: false }, """
  <html>
    <script type="text/javascript" src="one.js"></script>
    <script type="text/javascript" src="one.js"></script>
    <script type="text/javascript" src="two.js"></script>
    <script type="text/javascript" src="file.js"></script>
    <script type="text/javascript" src="script.js"></script>
  </html>
""", {
  'script.js': """
    alert(1)
    1 + 1;
    alert(2)
  """
}
