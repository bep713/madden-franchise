// USAGE:
//  node schema-generator.js [input file path] [output file folder]

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const XmlStream = require('xml-stream');
const FranchiseEnum = require('./FranchiseEnum');
const EventEmitter = require('events').EventEmitter;
const utilService = require('./services/utilService');

class FranchiseSchema extends EventEmitter {
  constructor (inputFile, outputFile) {
    super();
    this.schemas = [];
    this.enums = [];

    const stream = fs.createReadStream(path.join(__dirname, inputFile));
    this.xml = new XmlStream(stream);

    this.xml.collect('attribute');

    const that = this;
    this.xml.on('endElement: FranTkData', function (data) {
      const majorVersion = data.$.dataMajorVersion;
      const minorVersion = data.$.dataMinorVersion;

      calculateInheritedSchemas();
        // fs.writeFileSync(outputFile, JSON.stringify(that.schemas));
        zlib.gzip(JSON.stringify(that.schemas), function (_, data) {
          fs.writeFileSync(`${outputFile}/${majorVersion}_${minorVersion}.gz`, data);
        });
        that.emit('schemas:done', that.schemas);
    });

    this.xml.on('endElement: enum', function (theEnum) {
      console.log(`Adding enum ${theEnum.$.name}`);
      let newEnum = new FranchiseEnum(theEnum.$.name, theEnum.$.assetId, theEnum.$.isRecordPersistent);

      if (theEnum.attribute) {
        theEnum.attribute.forEach((attribute) => {
          newEnum.addMember(attribute.$.name, attribute.$.idx, attribute.$.value);
        });
      }

      newEnum.setMemberLength();
      that.enums.push(newEnum);
    });

    this.xml.on('endElement: schema', function (schema) {
      console.log(`Adding schema ${schema.$.name}`);
      let attributes = [];
      
      if (schema.attribute) {
        attributes = schema.attribute.map((attribute) => {
          return {
            'index': attribute.$.idx,
            'name': attribute.$.name,
            'type': attribute.$.type,
            'minValue': attribute.$.minValue,
            'maxValue': attribute.$.maxValue,
            'maxLength': attribute.$.maxLen,
            'default': attribute.$.default,
            'final': attribute.$.final,
            'enum': that.getEnum(attribute.$.type),
            'const': attribute.$.const
          }
        });
      }

      const element = {
        'assetId': schema.$.assetId,
        'ownerAssetId': schema.$.ownerAssetId,
        'numMembers': schema.$.numMembers,
        'name': schema.$.name,
        'base': schema.$.base,
        'attributes': attributes
      };

      that.schemas.push(element);

      if (element.name === 'WinLossStreakPlayerGoal') {
        // calculateInheritedSchemas();
        // // fs.writeFileSync(outputFile, JSON.stringify(that.schemas));
        // zlib.gzip(JSON.stringify(that.schemas), function (_, data) {
        //   fs.writeFileSync(outputFile, data);
        // });
        // that.emit('schemas:done', that.schemas);
      }
    });

    function calculateInheritedSchemas() {
      const schemasWithBase = that.schemas.filter((schema) => { return schema.base && schema.base.indexOf("()") === -1; });
      schemasWithBase.forEach((schema) => {
        if (schema.base && schema.base.indexOf('()') === -1) {
          schema.originalAttributesOrder = schema.attributes;
          const baseSchema = that.schemas.find((schemaToSearch) => { return schemaToSearch.name === schema.base; });

          if (baseSchema) {
            baseSchema.attributes.forEach((baseAttribute, index) => {
              let oldIndex = schema.attributes.findIndex((schemaAttribute) => { return schemaAttribute.name === baseAttribute.name; });
              utilService.arrayMove(schema.attributes, oldIndex, index);
            });
          }
        }
      });
    };
  };

  getSchema(name) {
    return this.schemas.find((schema) => { return schema.name === name; });
  };

  getEnum(name) {
    return this.enums.find((theEnum) => { return theEnum.name === name; });
  };
};

let schema = new FranchiseSchema(process.argv[2], process.argv[3]);

schema.on('schemas:done', () => {
  done = true;
});

let done = false;

function wait () {
  if (!done) {
    setTimeout(wait, 500);
  }
};

wait();