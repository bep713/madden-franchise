/// <reference types="node" />
export default FranchiseSchema;
export type SchemaAttribute = any;
export type TableSchema = any;
/**
 * @typedef SchemaAttribute
 * @param {string} index
 * @param {string} name
 * @param {string} type
 * @param {string} minValue
 * @param {string} maxValue
 * @param {string} maxLength
 * @param {string} default
 * @param {string} final
 * @param {FranchiseEnum?} [enum]
 * @param {string}
 */
/**
 * @typedef TableSchema
 * @param {number} assetId
 * @param {number} ownerAssetId
 * @param {number} numMembers
 * @param {string} name
 * @param {string} base
 * @param {Array<SchemaAttribute>} attributes
 */
declare class FranchiseSchema extends events {
    constructor(filePath: any, { useNewSchemaGeneration, extraSchemas, fileMap }?: {
        useNewSchemaGeneration?: boolean | undefined;
        extraSchemas?: any[] | undefined;
        fileMap?: {} | undefined;
    });
    schemas: any[];
    path: any;
    useNewSchemaGeneration: boolean;
    extraSchemas: any[];
    fileMap: {};
    evaluate(): void;
    getSchema(name: any): any;
    getEnum(name: any): any;
    evaluateSchemaGzip(): void;
    schema: any;
    meta: any;
    schemaMap: any;
    enumMap: {} | undefined;
    evaluateSchemaXml(): void;
}
import events from 'events';
//# sourceMappingURL=FranchiseSchema.d.ts.map