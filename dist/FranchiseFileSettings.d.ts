export default FranchiseFileSettings;
export type SettingsParam = any;
/**
 * @typedef {Object} SettingsParam
 * @param {boolean?} [saveOnChange]
 * @param {SchemaMetadata?} [schemaOverride]
 * @param {string?} [schemaDirectory]
 * @param {boolean?} [autoParse]
 * @param {boolean?} [autoUnempty]
*/
declare class FranchiseFileSettings {
    /** @param {SettingsParam} settings */
    constructor(settings: SettingsParam);
    /** @type {boolean} */
    saveOnChange: boolean;
    /** @type {SchemaMetadata | false} */
    schemaOverride: SchemaMetadata | false;
    /** @type {string | false} */
    schemaDirectory: string | false;
    /** @type {boolean} */
    useNewSchemaGeneration: boolean;
    /** @type {Object} */
    schemaFileMap: any;
    /** @type {Object[]} */
    extraSchemas: any[];
    /** @type {boolean} */
    autoParse: boolean;
    /** @type {boolean} */
    autoUnempty: boolean;
    /** @type {number} */
    gameYearOverride: number;
}
//# sourceMappingURL=FranchiseFileSettings.d.ts.map