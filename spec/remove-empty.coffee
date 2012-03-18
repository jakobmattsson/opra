test 'remove-empty', {
  'index.html': """
    <html>
      <!--OPRA

      -->
      <!--OPRA

      -->
      <!--FAKE

      -->
    </html>
  """
}, {}, """
  <html>


    <!--FAKE

    -->
  </html>
"""
