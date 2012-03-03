test 'should remove empty opra-tags', {
  'index.html': """
    <html>
      <!--OPRA-SCRIPTS

      -->
      <!--OPRA-STYLES

      -->
      <!--OPRA-FAKE

      -->
    </html>
  """
}, {}, """
  <html>


    <!--OPRA-FAKE

    -->
  </html>
"""