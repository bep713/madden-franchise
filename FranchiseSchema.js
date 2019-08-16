const fs = require('fs');
const path = require('path');
const XmlStream = require('xml-stream');
const FranchiseEnum = require('./FranchiseEnum');
const EventEmitter = require('events').EventEmitter;
const utilService = require('./services/utilService');
const FranchiseEnumValue = require('./FranchiseEnumValue');

let schemaFilePath;
const schemaXmlPaths = {
  19: './data/schemas/schema-19.xml',
  20: './data/schemas/schema-20.xml'
};

const schemaJsonPaths = {
  19: './data/schemas/schema-19.json',
  20: './data/schemas/schema-20.json'
};

class FranchiseSchema extends EventEmitter {
  constructor (gameYear) {
    super();
    this.schemas = require(schemaJsonPaths[gameYear]);

    for (let i = 0; i < this.schemas.length; i++) {
      const schema = this.schemas[i];

      for (let j = 0; j < schema.attributes.length; j++) {
        const attribute = schema.attributes[j];

        if (attribute.enum) {
          attribute.enum = new FranchiseEnum(attribute.enum);
        } 
      }
    }

    // UNCOMMENT BELOW CODE FOR NEW MADDEN VERSION TO CREATE SCHEMA JSON. UNCOMMENT PART IN FRANCHISEFILE TO WAIT FOR PROMISE. COMMENT ANYTHING AFTER THE SUPER() CALL ABOVE AS WELL!

    // this.schemas = [];
    // this.enums = [];

    // schemaFilePath = schemaXmlPaths[gameYear];

    // const stream = fs.createReadStream(path.join(__dirname, schemaFilePath));
    // this.xml = new XmlStream(stream);

    // this.xml.collect('attribute');

    // const that = this;
    // this.xml.on('endElement: schema', function (schema) {
    //   let attributes = [];
      
    //   if (schema.attribute) {
    //     attributes = schema.attribute.map((attribute) => {
    //       return {
    //         'index': attribute.$.idx,
    //         'name': attribute.$.name,
    //         'type': attribute.$.type,
    //         'minValue': attribute.$.minValue,
    //         'maxValue': attribute.$.maxValue,
    //         'maxLength': attribute.$.maxLen,
    //         'default': attribute.$.default,
    //         'final': attribute.$.final,
    //         'enum': that.getEnum(attribute.$.type),
    //         'const': attribute.$.const
    //       }
    //     });
    //   }

    //   const element = {
    //     'assetId': schema.$.assetId,
    //     'ownerAssetId': schema.$.ownerAssetId,
    //     'numMembers': schema.$.numMembers,
    //     'name': schema.$.name,
    //     'base': schema.$.base,
    //     'attributes': attributes
    //   };

    //   that.schemas.push(element);

    //   if (element.name === 'WinLossStreakPlayerGoal') {
    //     calculateInheritedSchemas();
    //     fs.writeFileSync('schema.json', JSON.stringify(that.schemas));
    //     that.emit('schemas:done', that.schemas);
    //   }
    // });

    // this.xml.on('endElement: enum', function (theEnum) {
    //   let newEnum = new FranchiseEnum(theEnum.$.name, theEnum.$.assetId, theEnum.$.isRecordPersistent);

    //   if (theEnum.attribute) {
    //     theEnum.attribute.forEach((attribute) => {
    //       newEnum.addMember(attribute.$.name, attribute.$.idx, attribute.$.value);
    //     });
    //   }

    //   newEnum.setMemberLength();
    //   that.enums.push(newEnum);
    // });

    // function calculateInheritedSchemas() {
    //   const schemasWithBase = that.schemas.filter((schema) => { return schema.base && schema.base.indexOf("()") === -1; });
    //   schemasWithBase.forEach((schema) => {
    //     if (schema.base && schema.base.indexOf('()') === -1) {
    //       schema.originalAttributesOrder = schema.attributes;
    //       const baseSchema = that.schemas.find((schemaToSearch) => { return schemaToSearch.name === schema.base; });

    //       if (baseSchema) {
    //         baseSchema.attributes.forEach((baseAttribute, index) => {
    //           let oldIndex = schema.attributes.findIndex((schemaAttribute) => { return schemaAttribute.name === baseAttribute.name; });
    //           utilService.arrayMove(schema.attributes, oldIndex, index);
    //         });
    //       }
    //     }
    //   });
    // };
  };

  getSchema(name) {
    return this.schemas.find((schema) => { return schema.name === name; });
  };

  getEnum(name) {
    return this.enums.find((theEnum) => { return theEnum.name === name; });
  };
};

module.exports = FranchiseSchema;