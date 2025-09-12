// USAGE:
//  node schema-generator-script.js [input file folder] [output file folder] [main schema name] [extra schema path]
const fs = require('fs/promises');
const path = require('path');
const { gzipSync } = require('zlib');
const { generateSchemaV2 } = require('../src/services/schemaGeneratorV2');

let done = false;

(async () => {
    const files = await fs.readdir(process.argv[2], { withFileTypes: true });
    const schemas = files.filter(
        (f) =>
            f.isFile() && f.name.endsWith('.FTX') && f.name !== 'football.FTX'
    );
    const mainSchemaName = process.argv[4] || 'franchise-schemas.FTX';

    const main = schemas.find((f) => f.name === mainSchemaName);
    const otherSchemas = schemas
        .filter((f) => f.name !== mainSchemaName)
        .reduce((acc, file) => {
            const name = file.name.replace(/\.FTX$/i, '');
            acc[name] = path.join(process.argv[2], file.name);
            return acc;
        }, {});

    const schema = await generateSchemaV2({
        fileMap: {
            main: path.join(process.argv[2], main.name),
            ...otherSchemas
        },
        extraSchemas: process.argv[5]
            ? JSON.parse(await fs.readFile(process.argv[5], 'utf8'))
            : undefined
    });

    const outputPath = process.argv[3] || __dirname;
    const compressed = gzipSync(JSON.stringify(schema));
    await fs.writeFile(
        path.join(
            outputPath,
            `M${schema.meta.gameYear}_${schema.meta.major}_${schema.meta.minor}.gz`
        ),
        compressed
    );
    done = true;
})();

function wait() {
    if (!done) {
        setTimeout(wait, 500);
    }
}

wait();
