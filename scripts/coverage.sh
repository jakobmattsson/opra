mkdir -p test-coverage
rm -rf test-cov
node-jscoverage lib/ test-cov
SRC_DIR=test-cov mocha --require spec/lib.js --reporter html-cov $1 > test-coverage/$2
rm -rf test-cov
open test-coverage/$2
