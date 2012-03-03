test 'should return an unmodified string if the there are no opra-tags', {
  'index.html': """
    hello
  """
}, {}, """
  hello
"""
