test 'less-error-light', {
  'index.html': """
    <html>
      <!--OPRA
        one.less
      -->
    </html>
  """
  'one.less': """
    a {
      color: apa ();
    }
  """
}, { inline: true }, """
  <html>
    <script type="text/x-opra">
      a {
        color: apa ();
      }
    </script>
  </html>
"""