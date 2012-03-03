test 'dont detect type automatically', {
  'index.html': """
    <html>
      <!--OPRA-SCRIPTS
        one.css
      -->
    </html>
  """
  'one.css': """
    a{color:red}
  """
}, {}, """
  <html>
    <script type="text/javascript" src="one.css"></script>
  </html>
"""
