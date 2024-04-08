export = FranchiseFileSettings;
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
    autoParse: boolean;
    /** @type {boolean} */
    autoUnempty: boolean;
}
declare namespace FranchiseFileSettings {
    export { SettingsParam };
}
type SettingsParam = any;
//# sourceMappingURL=FranchiseFileSettings.d.ts.map