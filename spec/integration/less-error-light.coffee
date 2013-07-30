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
}, { inline: true }, {
  error:
    type: "Parse"
    message: "Syntax Error on line 2"
    index: 6
    filename: null
    line: 2
    column: 2
    extract: [
      "a {",
      "  color: apa ();",
      "}"
    ]
}