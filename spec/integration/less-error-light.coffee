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
    callLine: NaN
    type: "Parse"
    message: "Unrecognised input"
    index: 6
    filename: "input"
    line: 2
    column: 2
    extract: [
      "a {",
      "  color: apa ();",
      "}"
    ]
}