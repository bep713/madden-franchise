export default schemaPicker;
declare namespace schemaPicker {
    /** @param {number} gameYear @param {number} major @param {number} minor @param {FranchiseFileSettings?} [settings] @returns {SchemaMetadata?} */
    function pick(gameYear: number, major: number, minor: number, settings?: any): any;
    /** @param {string} customDirectory @returns {Array<SchemaMetadata>} */
    function retrieveSchemas(customDirectory: string): SchemaMetadata[];
}
//# sourceMappingURL=schemaPicker.d.ts.map