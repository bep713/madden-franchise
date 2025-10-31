import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import FranchiseEnum from './FranchiseEnum.js';
import events from 'events';
import schemaGenerator from './services/schemaGenerator.js';
import { generateSchemaV2 } from './services/schemaGeneratorV2.js';
const EventEmitter = events.EventEmitter;
/**
 * @typedef SchemaAttribute
 * @property {string} index
 * @property {string} name
 * @property {string} type
 * @property {string} minValue
 * @property {string} maxValue
 * @property {string} maxLength
 * @property {string} default
 * @property {string} final
 * @property {FranchiseEnum?} [enum]
 * @property {string}
 */
/**
 * @typedef TableSchema
 * @property {number} assetId
 * @property {number} ownerAssetId
 * @property {number} numMembers
 * @property {string} name
 * @property {string} base
 * @property {Array<SchemaAttribute>} attributes
 */
class FranchiseSchema extends EventEmitter {
    constructor(
        filePath,
        { useNewSchemaGeneration = false, extraSchemas = [], fileMap = {} } = {}
    ) {
        super();
        this.schemas = [];
        this.path = filePath;
        this.useNewSchemaGeneration = useNewSchemaGeneration;
        this.extraSchemas = extraSchemas;
        this.fileMap = fileMap;
    }
    evaluate() {
        const fileExtension = path.extname(this.path).toLowerCase();
        switch (fileExtension) {
            case '.gz':
                // const schemaFile = fs.readFileSync(this.path);
                this.evaluateSchemaGzip(this.path);
                break;
            case '.ftx':
            case '.xml':
                this.evaluateSchemaXml();
                break;
            default:
                throw new Error(
                    'Invalid schema. Please make sure your schema file is of correct format (.gz, .xml, or .ftx).'
                );
        }
    }
    getSchema(name) {
        // return this.schemas.find((schema) => { return schema.name === name; });
        return this.schemaMap[name];
    }
    getEnum(name) {
        return this.enums.find((theEnum) => {
            return theEnum.name === name;
        });
    }
    evaluateSchemaGzip() {
        const schemaFile = fs.readFileSync(this.path);
        const uncompressed = zlib.gunzipSync(schemaFile);
        this.schema = JSON.parse(uncompressed.toString());
        this.meta = this.schema.meta;
        this.schemas = this.schema.schemas;
        this.schemaMap = {};
        this.enumMap = {};
        for (let i = 0; i < this.schemas.length; i++) {
            const schema = this.schemas[i];
            this.schemaMap[schema.name] = schema;
            for (let j = 0; j < schema.attributes.length; j++) {
                const attribute = schema.attributes[j];
                if (attribute.enum) {
                    attribute.enum = new FranchiseEnum(attribute.enum);
                    this.enumMap[attribute.enum.name] = attribute.enum;
                }
            }
        }
        let addedExtraSchema = false;
        const extraSchemas = schemaGenerator.getExtraSchemas();
        extraSchemas.forEach((schema) => {
            if (!this.schemaMap[schema.name]) {
                schema.attributes.forEach((attrib) => {
                    if (attrib.enum) {
                        attrib.enum = new FranchiseEnum(
                            this.enumMap[attrib.enum]
                        );
                    }
                });
                this.schemas.unshift(schema);
                this.schemaMap[schema.name] = schema;
                addedExtraSchema = true;
            }
        });
        if (addedExtraSchema) {
            schemaGenerator.calculateInheritedSchemas(this.schemas);
        }
        this.emit('schemas:done');
    }
    evaluateSchemaXml() {
        if (this.useNewSchemaGeneration) {
            generateSchemaV2({
                fileMap: this.fileMap,
                extraSchemas: this.extraSchemas
            }).then((schema) => {
                this.schema = schema;
                this.meta = schema.meta;
                this.schemas = schema.schemas;
                this.schemaMap = schema.schemaMap;
                this.emit('schemas:done');
            });
        } else {
            schemaGenerator.eventEmitter.on('schemas:done', (schema) => {
                this.schema = schema;
                this.meta = schema.meta;
                this.schemas = schema.schemas;
                this.schemaMap = schema.schemaMap;
                this.emit('schemas:done');
            });
            schemaGenerator.generate(this.path);
        }
    }
}
export default FranchiseSchema;
