// USAGE:
//  node schema-generator-script.js [input file path] [output file folder]
const path = require('path');
const schemaGenerator = require('./services/schemaGenerator');

schemaGenerator.eventEmitter.on('schemas:done', () => {
  done = true;
});

schemaGenerator.generate(process.argv[2], true, process.argv[3]);

let done = false;

function wait () {
  if (!done) {
    setTimeout(wait, 500);
  }
};

wait();