test 'type-detection', {
  'index.html': """
    <html>
      <!--OPRA
        one.css
        one.js
        one.coffee
        one.less
      -->
    </html>
  """
  'one.css': """
    a {
      color: red
    }
  """
  'one.js': """
    alert(1 + 2);
  """
  'one.coffee': """
    block = (f) -> f()
  """
  'one.less': """
    @base: #f938ab;
    a {
      color: @base;
    }
  """
}, { inline: true }, """
  <html>
    <style type="text/css">
      a {
        color: red
      }
    </style>
    <script type="text/javascript">
      alert(1 + 2);
    </script>
    <script type="text/javascript">
      (function() {
        var block;
      
        block = function(f) {
          return f();
        };
      
      }).call(this);
    </script>
    <style type="text/css">
      a {
        color: #f938ab;
      }
    </style>
  </html>
"""
