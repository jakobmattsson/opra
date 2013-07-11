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
    type: "Name"
    message: ".apa is undefined"
    filename: null
    index: 6
    line: 2
    column: 2
    stack: undefined
    callLine: undefined
    callExtract: undefined
    extract: [
      "a {",
      "  .apa ();",
      "}"
    ]
}