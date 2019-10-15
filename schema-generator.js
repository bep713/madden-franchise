// USAGE:
//  node schema-generator.js [input file path] [output file folder]
const path = require('path');
const schemaGenerator = require('./services/schema-generator');

schemaGenerator.eventEmitter.on('schemas:done', () => {
  done = true;
});

schemaGenerator.generate(path.join('../', process.argv[2]), true, path.join('../', process.argv[3]));

let done = false;

function wait () {
  if (!done) {
    setTimeout(wait, 500);
  }
};

wait();