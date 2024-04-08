export = FranchiseSchema;
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
declare class FranchiseSchema {
    constructor(filePath: any);
    schemas: any[];
    path: any;
    evaluate(): void;
    getSchema(name: any): any;
    getEnum(name: any): any;
    evaluateSchemaGzip(schemaPath: any): void;
    schema: any;
    meta: any;
    schemaMap: any;
    enumMap: {};
    evaluateSchemaXml(): void;
}
declare namespace FranchiseSchema {
    export { SchemaAttribute, TableSchema };
}
type SchemaAttribute = any;
type TableSchema = any;
//# sourceMappingURL=FranchiseSchema.d.ts.map