test 'inlining-images', {
  'index.html': """
    <html>
      <!--OPRA
        one.css datauris
        two.css datauris
        /assets/three.css datauris
        /integration/four.css datauris
        one.css
      -->
    </html>
  """
  'one.css': """
    div {
      width: 10px;
      height: 20px;
      background-image: url('assets/close.png')
    }
  """
  'two.css': """
    div {
      width: 10px;
      height: 20px;
    }
  """
  '/assets/three.css': """
    span {
      width: 10px;
      height: 20px;
      background-image: url('close.png')
    }
  """
  '/integration/four.css': """
    span {
      width: 10px;
      height: 20px;
      background-image: url(../assets/close.png)
    }
  """
}, { }, """
  <html>
    <link rel="stylesheet" type="text/css" href="/.opra-cache/one.css" />
    <link rel="stylesheet" type="text/css" href="two.css" />
    <link rel="stylesheet" type="text/css" href="/.opra-cache/assets/three.css" />
    <link rel="stylesheet" type="text/css" href="/.opra-cache/integration/four.css" />
    <link rel="stylesheet" type="text/css" href="one.css" />
  </html>
""", {
  '/.opra-cache/one.css': """
    div {
      width: 10px;
      height: 20px;
      background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH1gcHCyMfGLAkTgAAAppJREFUOMuVk0+LFFcUxX9V9aq63lhdXWVbTlrtDExpixsRe6Fgh2yCy3yCTAhGMTERQaMYNy7cuFARXLjwD6JrF4K4SPINzHJIoskMaMCJSXom092jVne9d7PoYaIEBO/m3LM498K55zpAAMSr+C41BHoKSM9XK59HjrPfdWh6MP02lYF5K/w+EPnudL+4oQAncpz9Hx+c+TDZWAdjwRrEGhDzX2/GXKydXvprcfrB3e8BbirAeg5b0qlNlH8/o+w+w1pBRLDWYldxzIVKLSHdnFHPki30/rBuu932XMjxPcyrJST0iQ+fwd3cxDDEyBCvOUX967PYiZCVlWUIFRVdydvttud2Oh0fQBBEIP70JOGufdRPXMRvbsV/fxvvnbrMut0fsPHgt5hyBGJBhE6n46tWqzV23xqsWHr3b1PfthN3IiI7cQkAdyLCvBiweO/W2ElrAWi1WoHK87zyBLD9lxRPuoxm53n19ACbLlzHq8Zj5/s95o59xsv5xxgRTL0BIuR5XnGzLAsBzNKA0UrBaFBgivJ/57NDw2hQUA4Kym4fKQ1ZloVukiQaQIYjrBX8fDvNK7fwqjGm38P0e3jVmK1X76BbO7ACUgyRUUmSJNqNokiveWAtGw58tSb+7cgMv345Q9nvoaoxjUNHERGwBkSIokgrrfUbA56eO02T8yxcu8KLxz8jIjw6/AmNQ0eZO3sKT3mrIQOttVZKKe1XqwtiTUOn6+n/+Zy5b46snVVEGPzyE4+Of4Ef+NTSGIxBQr2glNIqCIKwkqTdf7qLjVqaMlGLxxusQcxrUX4t0su9AUM/7AZBECrATu7ZO/vwx4dusbRYHy4vT77tmYJa7XklXd+d3LN3FrCOiEwBHwHr3vGdV4Af/gXVzUVdmatoKQAAAABJRU5ErkJggg==)
    }
  """
  '/.opra-cache/assets/three.css': """
    span {
      width: 10px;
      height: 20px;
      background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH1gcHCyMfGLAkTgAAAppJREFUOMuVk0+LFFcUxX9V9aq63lhdXWVbTlrtDExpixsRe6Fgh2yCy3yCTAhGMTERQaMYNy7cuFARXLjwD6JrF4K4SPINzHJIoskMaMCJSXom092jVne9d7PoYaIEBO/m3LM498K55zpAAMSr+C41BHoKSM9XK59HjrPfdWh6MP02lYF5K/w+EPnudL+4oQAncpz9Hx+c+TDZWAdjwRrEGhDzX2/GXKydXvprcfrB3e8BbirAeg5b0qlNlH8/o+w+w1pBRLDWYldxzIVKLSHdnFHPki30/rBuu932XMjxPcyrJST0iQ+fwd3cxDDEyBCvOUX967PYiZCVlWUIFRVdydvttud2Oh0fQBBEIP70JOGufdRPXMRvbsV/fxvvnbrMut0fsPHgt5hyBGJBhE6n46tWqzV23xqsWHr3b1PfthN3IiI7cQkAdyLCvBiweO/W2ElrAWi1WoHK87zyBLD9lxRPuoxm53n19ACbLlzHq8Zj5/s95o59xsv5xxgRTL0BIuR5XnGzLAsBzNKA0UrBaFBgivJ/57NDw2hQUA4Kym4fKQ1ZloVukiQaQIYjrBX8fDvNK7fwqjGm38P0e3jVmK1X76BbO7ACUgyRUUmSJNqNokiveWAtGw58tSb+7cgMv345Q9nvoaoxjUNHERGwBkSIokgrrfUbA56eO02T8yxcu8KLxz8jIjw6/AmNQ0eZO3sKT3mrIQOttVZKKe1XqwtiTUOn6+n/+Zy5b46snVVEGPzyE4+Of4Ef+NTSGIxBQr2glNIqCIKwkqTdf7qLjVqaMlGLxxusQcxrUX4t0su9AUM/7AZBECrATu7ZO/vwx4dusbRYHy4vT77tmYJa7XklXd+d3LN3FrCOiEwBHwHr3vGdV4Af/gXVzUVdmatoKQAAAABJRU5ErkJggg==)
    }
  """
  '/.opra-cache/integration/four.css': """
    span {
      width: 10px;
      height: 20px;
      background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH1gcHCyMfGLAkTgAAAppJREFUOMuVk0+LFFcUxX9V9aq63lhdXWVbTlrtDExpixsRe6Fgh2yCy3yCTAhGMTERQaMYNy7cuFARXLjwD6JrF4K4SPINzHJIoskMaMCJSXom092jVne9d7PoYaIEBO/m3LM498K55zpAAMSr+C41BHoKSM9XK59HjrPfdWh6MP02lYF5K/w+EPnudL+4oQAncpz9Hx+c+TDZWAdjwRrEGhDzX2/GXKydXvprcfrB3e8BbirAeg5b0qlNlH8/o+w+w1pBRLDWYldxzIVKLSHdnFHPki30/rBuu932XMjxPcyrJST0iQ+fwd3cxDDEyBCvOUX967PYiZCVlWUIFRVdydvttud2Oh0fQBBEIP70JOGufdRPXMRvbsV/fxvvnbrMut0fsPHgt5hyBGJBhE6n46tWqzV23xqsWHr3b1PfthN3IiI7cQkAdyLCvBiweO/W2ElrAWi1WoHK87zyBLD9lxRPuoxm53n19ACbLlzHq8Zj5/s95o59xsv5xxgRTL0BIuR5XnGzLAsBzNKA0UrBaFBgivJ/57NDw2hQUA4Kym4fKQ1ZloVukiQaQIYjrBX8fDvNK7fwqjGm38P0e3jVmK1X76BbO7ACUgyRUUmSJNqNokiveWAtGw58tSb+7cgMv345Q9nvoaoxjUNHERGwBkSIokgrrfUbA56eO02T8yxcu8KLxz8jIjw6/AmNQ0eZO3sKT3mrIQOttVZKKe1XqwtiTUOn6+n/+Zy5b46snVVEGPzyE4+Of4Ef+NTSGIxBQr2glNIqCIKwkqTdf7qLjVqaMlGLxxusQcxrUX4t0su9AUM/7AZBECrATu7ZO/vwx4dusbRYHy4vT77tmYJa7XklXd+d3LN3FrCOiEwBHwHr3vGdV4Af/gXVzUVdmatoKQAAAABJRU5ErkJggg==)
    }
  """
}
