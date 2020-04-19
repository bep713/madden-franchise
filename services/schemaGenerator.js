// USAGE:
//  node schema-generator.js [input file path] [output file folder]

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const XmlStream = require('xml-stream');
const utilService = require('./utilService');
const FranchiseEnum = require('../FranchiseEnum');
const EventEmitter = require('events').EventEmitter;
const extraSchemas = require('../data/schemas/extra-schemas.json');

let schemaGenerator = {};
schemaGenerator.eventEmitter = new EventEmitter();

schemaGenerator.generate = (inputFile, showOutput, outputFile) => {
  const stream = fs.createReadStream(inputFile);
  schemaGenerator.generateFromStream(stream, showOutput, outputFile);
};

schemaGenerator.generateFromStream = (stream, showOutput, outputFile) => {
  schemaGenerator.root = {}
  schemaGenerator.schemas = [];
  schemaGenerator.schemaMap = {};
  schemaGenerator.enums = [];

  schemaGenerator.xml = new XmlStream(stream);

  schemaGenerator.xml.collect('attribute');

  schemaGenerator.xml.on('endElement: FranTkData', function (data) {
    const majorVersion = data.$.dataMajorVersion;
    const minorVersion = data.$.dataMinorVersion;
    const databaseName = data.$.databaseName;
    const gameYear = /Madden(\d{2})/.exec(databaseName)[1];

    addExtraSchemas();
    calculateInheritedSchemas();

    schemaGenerator.root = {
      'meta': {
        'major': parseInt(majorVersion),
        'minor': parseInt(minorVersion),
        'gameYear': parseInt(gameYear)
      },
      'schemas': schemaGenerator.schemas,
      'schemaMap': schemaGenerator.schemaMap
    };

    if (outputFile) {
      zlib.gzip(JSON.stringify(schemaGenerator.root), function (_, data) {
        fs.writeFileSync(`${outputFile}\\${majorVersion}_${minorVersion}.gz`, data);
      });
    }

    schemaGenerator.eventEmitter.emit('schemas:done', schemaGenerator.root);
  });

  schemaGenerator.xml.on('endElement: enum', function (theEnum) {
    if (showOutput) console.log(`Adding enum ${theEnum.$.name}`);

    let newEnum = new FranchiseEnum(theEnum.$.name, theEnum.$.assetId, theEnum.$.isRecordPersistent);

    if (theEnum.attribute) {
      theEnum.attribute.forEach((attribute) => {
        newEnum.addMember(attribute.$.name, attribute.$.idx, attribute.$.value);
      });
    }

    newEnum.setMemberLength();
    schemaGenerator.enums.push(newEnum);
  });

  schemaGenerator.xml.on('endElement: schema', function (schema) {
    if (showOutput) console.log(`Adding schema ${schema.$.name}`);
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
          'enum': getEnum(attribute.$.type),
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

    schemaGenerator.schemas.push(element);
    schemaGenerator.schemaMap[element.name] = element;

    if (element.name === 'WinLossStreakPlayerGoal') {
      // calculateInheritedSchemas();
      // // fs.writeFileSync(outputFile, JSON.stringify(schemaGenerator.schemas));
      // zlib.gzip(JSON.stringify(schemaGenerator.schemas), function (_, data) {
      //   fs.writeFileSync(outputFile, data);
      // });
      // schemaGenerator.emit('schemas:done', schemaGenerator.schemas);
    }
  });

  function addExtraSchemas() {
    extraSchemas.forEach((schema) => {

      if (!schemaGenerator.schemaMap[schema.name]) {
        schema.attributes.filter((attrib) => { 
          return attrib.enum && !(attrib.enum instanceof FranchiseEnum);
        }).forEach((attrib) => {
          attrib.enum = getEnum(attrib.enum);
        });
  
        schemaGenerator.schemas.unshift(schema);
      }
    });
  };

  function calculateInheritedSchemas() {
    schemaGenerator.calculateInheritedSchemas(schemaGenerator.schemas);
  };

  function getSchema(name) {
    return schemaGenerator.schemas.find((schema) => { return schema.name === name; });
  };

  function getEnum(name) {
    return schemaGenerator.enums.find((theEnum) => { return theEnum.name === name; });
  };
};

schemaGenerator.getExtraSchemas = () => {
  let newSchemas = [];

  extraSchemas.forEach((schema) => {
    schema.attributes.filter((attrib) => { 
      return attrib.enum && !(attrib.enum instanceof FranchiseEnum);
    }).forEach((attrib) => {
      attrib.enum = new FranchiseEnum(attrib.enum);
    });

    newSchemas.push(schema);
  });

  return newSchemas;
};

schemaGenerator.calculateInheritedSchemas = (schemaList) => {
  const schemasWithBase = schemaList.filter((schema) => { return schema.base && schema.base.indexOf("()") === -1; });
  schemasWithBase.forEach((schema) => {
    if (schema.base && schema.base.indexOf('()') === -1) {
      schema.originalAttributesOrder = schema.attributes;
      const baseSchema = schemaList.find((schemaToSearch) => { return schemaToSearch.name === schema.base; });

      if (baseSchema) {
        baseSchema.attributes.forEach((baseAttribute, index) => {
          let oldIndex = schema.attributes.findIndex((schemaAttribute) => { return schemaAttribute.name === baseAttribute.name; });
          utilService.arrayMove(schema.attributes, oldIndex, index);
        });
      }
    }
  });
};

module.exports = schemaGenerator;