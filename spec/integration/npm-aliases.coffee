test 'npm-aliases', {
  'index.html': """
    <html>
      <!--OPRA
        JSON npm as:json
        underscore npm as:_ as:underscore
        dust npm
      -->
    </html>
  """
}, { }, """
  <html>
    <script type="text/javascript" src="/index.html-npm/JSON.js"></script>
    <script type="text/javascript" src="/index.html-npm/JSON-require.js"></script>
    <script type="text/javascript" src="/index.html-npm/underscore.js"></script>
    <script type="text/javascript" src="/index.html-npm/underscore-require.js"></script>
    <script type="text/javascript" src="/index.html-npm/dust.js"></script>
  </html>
""", {
  'index.html-npm/dust.js': containsText()
  'index.html-npm/JSON.js': containsText()
  'index.html-npm/underscore.js': containsText()
  'index.html-npm/JSON-require.js': """
    window['json'] = require('JSON');
  """
  'index.html-npm/underscore-require.js': """
    window['_'] = require('underscore');
    window['underscore'] = require('underscore');
  """
}
