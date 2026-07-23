/**
 * @typedef {import('./FranchiseFile').SchemaMetadata} SchemaMetadata
 */

/**
 * @typedef {Object} SettingsParam
 * @property {boolean?} [saveOnChange]
 * @property {SchemaMetadata?} [schemaOverride]
 * @property {string?} [schemaDirectory]
 * @property {boolean?} [autoParse]
 * @property {boolean?} [autoUnempty]
 * @property {string?} [gameTypeOverride]
 */
class FranchiseFileSettings {
    /** @param {SettingsParam} settings */
    constructor(settings) {
        this.update(settings);
    }

    /** @param {SettingsParam} settings */
    update(settings) {
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
        /** @type {string} */
        this.gameTypeOverride =
            settings && settings.gameTypeOverride
                ? settings.gameTypeOverride
                : null;
    }
}
export default FranchiseFileSettings;
