import fs from 'fs/promises';
import path, { dirname } from 'path';
import { XMLParser } from 'fast-xml-parser';
import FranchiseEnum from '../FranchiseEnum.js';
import utilService from './utilService.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Parse FTX schema files with support for IncludeFile dependencies.
 * @param {{main: string, [id:string]: string}} fileMap - { main: '/abs/path/to/main.FTX', ...otherName: '/abs/path/to/other.FTX' }
 * @param {Object[]} [extraSchemas] - Optional array of extra schemas to include. If not included, will use defaults.
 * @returns {Promise<Object>} - Parsed schema object
 */
export async function generateSchemaV2({ fileMap, extraSchemas }) {
    const parsedFiles = {};
    const enums = [];
    const schemas = [];
    const schemaMap = {};
    let schemaMeta = {};
    if (!extraSchemas || extraSchemas.length === 0) {
        // Load extra schemas if available
        try {
            const extraPath = path.join(__dirname, '../../data/schemas/extra-schemas.json');
            const extraRaw = await fs.readFile(extraPath, 'utf8');
            extraSchemas = JSON.parse(extraRaw);
        }
        catch (e) {
            // ignore if not present
        }
    }
    // Recursively parse a file and its includes (async)
    async function parseFile(fileKey) {
        if (parsedFiles[fileKey])
            return;
        const filePath = fileMap[fileKey];
        if (!filePath)
            throw new Error(`Missing file mapping for: ${fileKey}`);
        const xml = await fs.readFile(filePath, 'utf8');
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', allowBooleanAttributes: true, trimValues: false });
        const doc = parser.parse(xml);
        const root = doc.FranTkData;
        if (!schemaMeta.databaseName && root.databaseName) {
            schemaMeta = {
                databaseName: root.databaseName,
                dataMajorVersion: root.dataMajorVersion,
                dataMinorVersion: root.dataMinorVersion
            };
        }
        // Parse includes first
        if (root.Includes && root.Includes.IncludeFile) {
            const includes = Array.isArray(root.Includes.IncludeFile)
                ? root.Includes.IncludeFile
                : [root.Includes.IncludeFile];
            for (const inc of includes) {
                let incKey = inc.fileName.replace(/\.FTX$/i, '');
                if (!fileMap[incKey]) {
                    // Try all lowercase
                    incKey = incKey.toLowerCase();
                    if (!fileMap[incKey]) {
                        console.warn(`schemaGeneratorV2: Missing file mapping for include: ${incKey} in ${fileKey}`);
                        continue; // Suppress missing include mapping
                    }
                }
                await parseFile(incKey);
            }
        }
        // Parse enums and schemas
        if (root.schemas) {
            const items = Object.entries(root.schemas)
                .flatMap(([tag, val]) => Array.isArray(val) ? val.map(v => ({ tag, ...v })) : [{ tag, ...val }]);
            for (const item of items) {
                if (item.tag === 'enum') {
                    const theEnum = new FranchiseEnum(item.name, item.assetId, item.isRecordPersistent);
                    theEnum._members = [];
                    if (item.attribute) {
                        const members = Array.isArray(item.attribute) ? item.attribute : [item.attribute];
                        for (const attr of members) {
                            theEnum.addMember && theEnum.addMember(attr.name, attr.idx, attr.value);
                        }
                    }
                    enums.push(theEnum);
                }
                else if (item.tag === 'schema') {
                    const schema = {
                        assetId: item.assetId,
                        ownerAssetId: item.ownerAssetId,
                        numMembers: item.numMembers,
                        name: item.name,
                        base: item.base,
                        attributes: []
                    };
                    if (item.attribute) {
                        const attrs = Array.isArray(item.attribute) ? item.attribute : [item.attribute];
                        for (const attr of attrs) {
                            schema.attributes.push(parseAttribute(attr));
                        }
                    }
                    schemas.push(schema);
                    schemaMap[schema.name] = schema;
                }
            }
        }
        parsedFiles[fileKey] = true;
    }
    // Attribute parsing logic (copied from schemaGenerator.js)
    function parseAttribute(attributeAttributes) {
        return {
            index: attributeAttributes.idx,
            name: attributeAttributes.name,
            type: attributeAttributes.type,
            minValue: attributeAttributes.minValue,
            maxValue: attributeAttributes.maxValue,
            maxLength: attributeAttributes.maxLen,
            default: getDefaultValue(attributeAttributes.default),
            final: attributeAttributes.final,
            enum: getEnum(attributeAttributes.type),
            const: attributeAttributes.const
        };
        function getDefaultValue(defaultVal) {
            if (!defaultVal) {
                return undefined;
            }
            // Only replace XML entities, do not trim or modify whitespace at all
            return defaultVal
                .replace(/&#xD;/g, '\r')
                .replace(/&#xA;/g, '\n')
                .replace(/&amp;/g, '&')
                .replace(/&gt;/g, '>')
                .replace(/&lt;/g, '<')
                .replace(/&quot;/g, '"');
        }
    }
    function getEnum(name) {
        return enums.find(theEnum => theEnum.name === name);
    }
    function addExtraSchemas() {
        if (!Array.isArray(extraSchemas))
            return;
        extraSchemas.forEach((schema) => {
            if (!schemaMap[schema.name]) {
                schema.attributes.filter((attrib) => {
                    return attrib.enum && !(attrib.enum instanceof FranchiseEnum);
                }).forEach((attrib) => {
                    attrib.enum = getEnum(attrib.enum);
                });
                schemas.unshift(schema);
            }
        });
    }
    function calculateInheritedSchemas(schemaList) {
        const schemasWithBase = schemaList.filter((schema) => schema.base && schema.base.indexOf('()') === -1);
        schemasWithBase.forEach((schema) => {
            if (schema.base && schema.base.indexOf('()') === -1) {
                schema.originalAttributesOrder = schema.attributes;
                const baseSchema = schemaList.find((schemaToSearch) => schemaToSearch.name === schema.base);
                if (baseSchema) {
                    baseSchema.attributes.forEach((baseAttribute, index) => {
                        let oldIndex = schema.attributes.findIndex((schemaAttribute) => schemaAttribute?.name === baseAttribute?.name);
                        utilService.arrayMove(schema.attributes, oldIndex, index);
                    });
                }
            }
        });
    }
    await parseFile('main');
    addExtraSchemas();
    calculateInheritedSchemas(schemas);
    // Set enum member lengths if needed
    enums.forEach(e => e.setMemberLength && e.setMemberLength());
    // Extract gameYear from databaseName
    const majorVersion = schemaMeta.dataMajorVersion;
    const minorVersion = schemaMeta.dataMinorVersion;
    const databaseName = schemaMeta.databaseName;
    const gameYearMatch = /Madden(\d{2})/.exec(databaseName);
    const gameYear = gameYearMatch ? parseInt(gameYearMatch[1]) : null;
    const root = {
        meta: {
            major: parseInt(majorVersion),
            minor: parseInt(minorVersion),
            gameYear
        },
        schemas,
        schemaMap
    };
    // Return the plain object
    return root;
}
