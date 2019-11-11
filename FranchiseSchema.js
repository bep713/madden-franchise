const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const FranchiseEnum = require('./FranchiseEnum');
const EventEmitter = require('events').EventEmitter;
const schemaGenerator = require('./services/schemaGenerator');

class FranchiseSchema extends EventEmitter {
  constructor (filePath) {
    super();
    this.path = filePath;
  };

  evaluate () {
    const fileExtension = path.extname(this.path).toLowerCase();

    switch (fileExtension) {
      case '.gz':
        const schemaFile = fs.readFileSync(this.path);
        this.evaluateSchemaGzip(schemaFile);
        break;
      case '.ftx':
      case '.xml':
        this.evaluateSchemaXml();
        break;
      default:
        throw new Error('Invalid schema. Please make sure your schema file is of correct format (.gz, .xml, or .ftx).');
    }
  };

  getSchema(name) {
    return this.schemas.find((schema) => { return schema.name === name; });
  };

  getEnum(name) {
    return this.enums.find((theEnum) => { return theEnum.name === name; });
  };

  evaluateSchemaGzip(schemaFile) {
    this.schema = JSON.parse(zlib.gunzipSync(schemaFile).toString());
    this.meta = this.schema.meta;
    this.schemas = this.schema.schemas;
  
    for (let i = 0; i < this.schemas.length; i++) {
      const schema = this.schemas[i];
  
      for (let j = 0; j < schema.attributes.length; j++) {
        const attribute = schema.attributes[j];
  
        if (attribute.enum) {
          attribute.enum = new FranchiseEnum(attribute.enum);
        } 
      }
    }

    this.emit('schemas:done');
  };

  evaluateSchemaXml() {
    schemaGenerator.eventEmitter.on('schemas:done', (schema) => {
      this.schema = schema;
      this.meta = schema.meta;
      this.schemas = schema.schemas;
      this.emit('schemas:done');
    });

    schemaGenerator.generate(this.path);
  };
};

module.exports = FranchiseSchema;