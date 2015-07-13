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
}, { inline: true }, {
  error:
    callLine: NaN
    type: "Name"
    message: ".apa is undefined"
    filename: "input"
    index: 6
    line: 2
    column: 2
    extract: [
      "a {",
      "  .apa ();",
      "}"
    ]
}