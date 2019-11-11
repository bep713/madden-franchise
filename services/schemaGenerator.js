// USAGE:
//  node schema-generator.js [input file path] [output file folder]

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const XmlStream = require('xml-stream');
const utilService = require('./utilService');
const FranchiseEnum = require('../FranchiseEnum');
const EventEmitter = require('events').EventEmitter;

let schemaGenerator = {};
schemaGenerator.eventEmitter = new EventEmitter();

schemaGenerator.generate = (inputFile, showOutput, outputFile) => {
  schemaGenerator.root = {}
  schemaGenerator.schemas = [];
  schemaGenerator.enums = [];

  const stream = fs.createReadStream(inputFile);
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
      'schemas': schemaGenerator.schemas
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
    if (!(schemaGenerator.schemas.find((schema) => { return schema.name === 'UserEntity'; }))) {
      if (showOutput) console.log('ADDING USER ENTITY EXTRA SCHEMA');
      addUserEntity();
    }

    if (!(schemaGenerator.schemas.find((schema) => { return schema.name === 'Reaction'; }))) {
      if (showOutput) console.log('ADDING REACTION EXTRA SCHEMA');
      addReaction();
    }

    function addUserEntity() {
      const element = {
        'numMembers': '1',
        'assetId': '28862',
        'name': 'UserEntity',
        'base': null,
        'attributes': [
          {
            'index': '0',
            'name': 'IsUserControlled',
            'type': 'bool',
            'minValue': null,
            'maxValue': null,
            'maxLength': null,
            'default': 'False',
            'final': null,
            'enum': getEnum(null),
            'const': null
          }
        ]
      };

      schemaGenerator.schemas.unshift(element);
    };

    function addReaction() {
      const element = {
        'numMembers': '2',
        'assetId': null,
        'name': 'Reaction',
        'base': 'none()',
        'attributes': [
          {
            'index': '1',
            'name': 'EventRecord',
            'type': 'record',
            'minValue': null,
            'maxValue': null,
            'maxLength': null,
            'default': null,
            'final': null,
            'enum': getEnum(null),
            'const': null
          },
          {
            'index': '0',
            'name': 'Handle',
            'type': 'bool()',
            'minValue': null,
            'maxValue': null,
            'maxLength': null,
            'default': null,
            'final': null,
            'enum': getEnum(null),
            'const': null
          }
        ]
      };

      schemaGenerator.schemas.unshift(element);
    };
    /* <schema name="UserEntity" numMembers="1" assetId="28862" isRecordPersistent="true">
            <attribute name="IsUserControlled" idx="0" type="bool" default="False" />
        </schema> */

    /* <schema name="Reaction" numMembers="1" base="none()">
            <attribute name="EventRecord" idx="1" type="record" />
            <attribute name="Handle" idx="0" type="bool()" />
        </schema> */
  };

  function calculateInheritedSchemas() {
    const schemasWithBase = schemaGenerator.schemas.filter((schema) => { return schema.base && schema.base.indexOf("()") === -1; });
    schemasWithBase.forEach((schema) => {
      if (schema.base && schema.base.indexOf('()') === -1) {
        schema.originalAttributesOrder = schema.attributes;
        const baseSchema = schemaGenerator.schemas.find((schemaToSearch) => { return schemaToSearch.name === schema.base; });

        if (baseSchema) {
          baseSchema.attributes.forEach((baseAttribute, index) => {
            let oldIndex = schema.attributes.findIndex((schemaAttribute) => { return schemaAttribute.name === baseAttribute.name; });
            utilService.arrayMove(schema.attributes, oldIndex, index);
          });
        }
      }
    });
  };

  function getSchema(name) {
    return schemaGenerator.schemas.find((schema) => { return schema.name === name; });
  };

  function getEnum(name) {
    return schemaGenerator.enums.find((theEnum) => { return theEnum.name === name; });
  };
};

module.exports = schemaGenerator;