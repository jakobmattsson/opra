test 'concat-js-and-coffee', {
  'index.html': """
    <html>
      <!--OPRA foo.js
        f1.js
        f2.coffee
      -->
    </html>
  """
  'f1.js': """
    alert(1)
  """
  'f2.coffee': """
    alert(1)
  """
}, { concat: true },
"""
  <html>
    <script type="text/javascript" src="foo.js"></script>
  </html>
""", {
  'foo.js': """
    alert(1);
    (function() {
      alert(1);
    
    }).call(this);
    
  """
}
