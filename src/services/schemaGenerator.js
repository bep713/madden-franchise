import fs from 'fs';
import path, { dirname } from 'path';
import zlib from 'zlib';
import { pipeline } from 'stream';
import utilService from './utilService.js';
import FranchiseEnum from '../FranchiseEnum.js';
import XmlParser from 'node-xml-stream-parser';
import { EventEmitter } from 'events';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let schemaGenerator = {};
schemaGenerator.eventEmitter = new EventEmitter();
/** @param {string} inputFile @param {boolean?} [showOutput] @param {string?} [outputFile] */
schemaGenerator.generate = (inputFile, showOutput, outputFile) => {
    const stream = fs.createReadStream(inputFile);
    schemaGenerator.generateFromStream(stream, showOutput, outputFile);
};
/** @param {ReadableStream} stream @param {boolean?} [showOutput] @param {string?} [outputFile] */
schemaGenerator.generateFromStream = (stream, showOutput, outputFile) => {
    schemaGenerator.root = {};
    schemaGenerator.schemas = [];
    schemaGenerator.schemaMap = {};
    schemaGenerator.schemaMeta = {};
    schemaGenerator.enums = [];
    const extraSchemas = schemaGenerator.getExtraSchemas();
    schemaGenerator.xml = new XmlParser();
    pipeline(stream, schemaGenerator.xml, (err) => {
        if (err) {
            console.error(err);
            throw err;
        }
        schemaGenerator.enums.forEach((theEnum) => {
            theEnum.setMemberLength();
        });
        const majorVersion = schemaGenerator.schemaMeta.dataMajorVersion;
        const minorVersion = schemaGenerator.schemaMeta.dataMinorVersion;
        const databaseName = schemaGenerator.schemaMeta.databaseName;
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
                fs.writeFileSync(path.join(outputFile, `${majorVersion}_${minorVersion}.gz`), data);
            });
        }
        schemaGenerator.eventEmitter.emit('schemas:done', schemaGenerator.root);
    });
    let currentParent = {
        type: '',
        ref: null
    };
    schemaGenerator.xml.on('opentag', (name, attrs) => {
        if (name === 'FranTkData') {
            schemaGenerator.schemaMeta.databaseName = attrs.databaseName;
            schemaGenerator.schemaMeta.dataMajorVersion = attrs.dataMajorVersion;
            schemaGenerator.schemaMeta.dataMinorVersion = attrs.dataMinorVersion;
        }
        else if (name === 'enum') {
            let theEnum = parseEnum(attrs);
            schemaGenerator.enums.push(theEnum);
            currentParent = {
                type: 'enum',
                ref: theEnum
            };
        }
        else if (name === 'schema') {
            let schema = parseSchema(attrs);
            schema.attributes = [];
            schemaGenerator.schemas.push(schema);
            schemaGenerator.schemaMap[schema.name] = schema;
            currentParent = {
                type: 'schema',
                ref: schema
            };
        }
        else if (name === 'attribute') {
            if (currentParent.type === 'enum') {
                currentParent.ref.addMember(attrs.name, attrs.idx, attrs.value);
            }
            else {
                const attribute = parseAttribute(attrs);
                currentParent.ref.attributes.push(attribute);
            }
        }
    });
    function parseEnum(enumAttributes) {
        return new FranchiseEnum(enumAttributes.name, enumAttributes.assetId, enumAttributes.isRecordPersistent);
    }
    ;
    function parseSchema(schemaAttributes) {
        return {
            'assetId': schemaAttributes.assetId,
            'ownerAssetId': schemaAttributes.ownerAssetId,
            'numMembers': schemaAttributes.numMembers,
            'name': schemaAttributes.name,
            'base': schemaAttributes.base
        };
    }
    ;
    function parseAttribute(attributeAttributes) {
        return {
            'index': attributeAttributes.idx,
            'name': attributeAttributes.name,
            'type': attributeAttributes.type,
            'minValue': attributeAttributes.minValue,
            'maxValue': attributeAttributes.maxValue,
            'maxLength': attributeAttributes.maxLen,
            'default': getDefaultValue(attributeAttributes.default),
            'final': attributeAttributes.final,
            'enum': getEnum(attributeAttributes.type),
            'const': attributeAttributes.const
        };
        function getDefaultValue(defaultVal) {
            if (!defaultVal) {
                return undefined;
            }
            defaultVal = defaultVal
                .replace(new RegExp('&#xD;', 'g'), '\r')
                .replace(new RegExp('&#xA;', 'g'), '\n')
                .replace(new RegExp('&amp;', 'g'), '&')
                .replace(new RegExp('&gt;', 'g'), '>')
                .replace(new RegExp('&lt;', 'g'), '<')
                .replace(new RegExp('&quot;', 'g'), '\"');
            return defaultVal;
        }
    }
    ;
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
    }
    ;
    function calculateInheritedSchemas() {
        schemaGenerator.calculateInheritedSchemas(schemaGenerator.schemas);
    }
    ;
    function getSchema(name) {
        return schemaGenerator.schemas.find((schema) => { return schema.name === name; });
    }
    ;
    function getEnum(name) {
        return schemaGenerator.enums.find((theEnum) => { return theEnum.name === name; });
    }
    ;
};
/** @returns {Record<string, any>} */
schemaGenerator.getExtraSchemas = () => {
    const filePath = path.join(__dirname, '../../data/schemas/extra-schemas.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
};
/** @param {Array<TableSchema>} schemaList */
schemaGenerator.calculateInheritedSchemas = (schemaList) => {
    const schemasWithBase = schemaList.filter((schema) => { return schema.base && schema.base.indexOf("()") === -1; });
    schemasWithBase.forEach((schema) => {
        if (schema.base && schema.base.indexOf('()') === -1) {
            schema.originalAttributesOrder = schema.attributes;
            const baseSchema = schemaList.find((schemaToSearch) => { return schemaToSearch.name === schema.base; });
            if (baseSchema) {
                baseSchema.attributes.forEach((baseAttribute, index) => {
                    let oldIndex = schema.attributes.findIndex((schemaAttribute) => { return schemaAttribute?.name === baseAttribute?.name; });
                    utilService.arrayMove(schema.attributes, oldIndex, index);
                });
            }
        }
    });
};
export default schemaGenerator;
