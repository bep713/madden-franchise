/**
 * @typedef {Object} SettingsParam
 * @param {boolean?} [saveOnChange]
 * @param {SchemaMetadata?} [schemaOverride]
 * @param {string?} [schemaDirectory]
 * @param {boolean?} [autoParse]
 * @param {boolean?} [autoUnempty]
 */
class FranchiseFileSettings {
    /** @param {SettingsParam} settings */
    constructor(settings) {
        /** @type {boolean} */
        this.saveOnChange =
            settings && settings.saveOnChange ? settings.saveOnChange : false;
        /** @type {SchemaMetadata | false} */
        this.schemaOverride =
            settings && settings.schemaOverride
                ? settings.schemaOverride
                : false;
        /** @type {string | false} */
        this.schemaDirectory =
            settings && settings.schemaDirectory
                ? settings.schemaDirectory
                : false;
        /** @type {boolean} */
        this.useNewSchemaGeneration = settings?.useNewSchemaGeneration ?? false;
        /** @type {Object} */
        this.schemaFileMap = settings?.schemaFileMap || {};
        /** @type {Object[]} */
        this.extraSchemas = settings?.extraSchemas || undefined;
        /** @type {boolean} */
        this.autoParse =
            settings &&
            settings.autoParse !== null &&
            settings.autoParse !== undefined
                ? settings.autoParse
                : true;
        /** @type {boolean} */
        this.autoUnempty =
            settings &&
            settings.autoUnempty !== null &&
            settings.autoUnempty !== undefined
                ? settings.autoUnempty
                : false;
        /** @type {number} */
        this.gameYearOverride =
            settings &&
            settings.gameYearOverride !== null &&
            settings.gameYearOverride !== undefined
                ? settings.gameYearOverride
                : null;
    }
}
export default FranchiseFileSettings;
