// USAGE:
//  node schema-generator-script.js [input file path] [output file folder]
import schemaGenerator from '../src/services/schemaGenerator.js';

schemaGenerator.eventEmitter.on('schemas:done', () => {
    done = true;
});

schemaGenerator.generate(process.argv[2], true, process.argv[3]);

let done = false;

function wait() {
    if (!done) {
        setTimeout(wait, 500);
    }
}

wait();
