test 'less-error-hard', {
  'index.html': """
    <html>
      <!--OPRA
        one.less
      -->
    </html>
  """
  'one.less': """
    a {
      .apa ();
    }
  """
}, { inline: true }, """
  <html>
    <script type="text/x-opra">
      a {
        .apa ();
      }
    </script>
  </html>
"""