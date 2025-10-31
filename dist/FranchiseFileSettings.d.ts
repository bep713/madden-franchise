export default FranchiseFileSettings;
export type SettingsParam = {
    saveOnChange?: boolean | null | undefined;
    schemaOverride?: SchemaMetadata | null;
    schemaDirectory?: string | null | undefined;
    autoParse?: boolean | null | undefined;
    autoUnempty?: boolean | null | undefined;
};
/**
 * @typedef {Object} SettingsParam
 * @property {boolean?} [saveOnChange]
 * @property {SchemaMetadata?} [schemaOverride]
 * @property {string?} [schemaDirectory]
 * @property {boolean?} [autoParse]
 * @property {boolean?} [autoUnempty]
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
    schemaFileMap: Object;
    /** @type {Object[]} */
    extraSchemas: Object[];
    /** @type {boolean} */
    autoParse: boolean;
    /** @type {boolean} */
    autoUnempty: boolean;
    /** @type {number} */
    gameYearOverride: number;
}
//# sourceMappingURL=FranchiseFileSettings.d.ts.map