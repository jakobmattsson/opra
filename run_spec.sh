rm -f spec/bar.js
rm -f spec/c.css
rm -f spec/foo.js
rm -f spec/script.js

rm -f bar.js
rm -f c.css
rm -f foo.js
rm -f script.js

mocha --require spec/lib.js spec/*

rm -f spec/bar.js
rm -f spec/c.css
rm -f spec/foo.js
rm -f spec/script.js

rm -f bar.js
rm -f c.css
rm -f foo.js
rm -f script.js
