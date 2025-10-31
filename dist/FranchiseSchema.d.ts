/// <reference types="node" />
export default FranchiseSchema;
export type SchemaAttribute = {
    index: string;
    name: string;
    type: string;
    minValue: string;
    maxValue: string;
    maxLength: string;
    default: string;
    final: string;
    enum?: FranchiseEnum | null | undefined;
    "": string;
};
export type TableSchema = {
    assetId: number;
    ownerAssetId: number;
    numMembers: number;
    name: string;
    base: string;
    attributes: Array<SchemaAttribute>;
};
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
import FranchiseEnum from './FranchiseEnum.js';
import events from 'events';
//# sourceMappingURL=FranchiseSchema.d.ts.map