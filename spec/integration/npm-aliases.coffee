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
    <script type="text/javascript" src="/.opra-cache/index.html-npm/JSON.js"></script>
    <script type="text/javascript" src="/.opra-cache/index.html-npm/JSON-require.js"></script>
    <script type="text/javascript" src="/.opra-cache/index.html-npm/underscore.js"></script>
    <script type="text/javascript" src="/.opra-cache/index.html-npm/underscore-require.js"></script>
    <script type="text/javascript" src="/.opra-cache/index.html-npm/dust.js"></script>
  </html>
""", {
  '.opra-cache/index.html-npm/dust.js': containsText()
  '.opra-cache/index.html-npm/JSON.js': containsText()
  '.opra-cache/index.html-npm/underscore.js': containsText()
  '.opra-cache/index.html-npm/dust.version': ''
  '.opra-cache/index.html-npm/JSON.version': ''
  '.opra-cache/index.html-npm/underscore.version': ''
  '.opra-cache/index.html-npm/JSON-require.js': """
    window['json'] = require('JSON');
  """
  '.opra-cache/index.html-npm/underscore-require.js': """
    window['_'] = require('underscore');
    window['underscore'] = require('underscore');
  """
}
