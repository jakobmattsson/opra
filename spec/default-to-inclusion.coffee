test 'default to include files', {
  'index.html': """
    <html>
      <!--OPRA-SCRIPTS
        one.js
      -->
    </html>
  """
  'one.js': """
    alert("hi")
  """
}, {}, """
  <html>
    <script type="text/javascript" src="one.js"></script>
  </html>
"""
