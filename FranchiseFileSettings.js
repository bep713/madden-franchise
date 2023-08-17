class FranchiseFileSettings {
  constructor(settings) {
    this.saveOnChange = settings && settings.saveOnChange ? settings.saveOnChange : false;
    this.schemaOverride = settings && settings.schemaOverride ? settings.schemaOverride: false;
    this.schemaDirectory = settings && settings.schemaDirectory ? settings.schemaDirectory : false;
    this.autoParse = settings && (settings.autoParse !== null && settings.autoParse !== undefined) ? settings.autoParse : true;
    this.autoUnempty = settings && (settings.autoUnempty !== null && settings.autoUnempty !== undefined) ? settings.autoUnempty : false;
  }
};

module.exports = FranchiseFileSettings;