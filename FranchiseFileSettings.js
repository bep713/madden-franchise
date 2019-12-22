class FranchiseFileSettings {
  constructor(settings) {
    this.saveOnChange = settings && settings.saveOnChange ? settings.saveOnChange : false;
    this.schemaOverride = settings && settings.schemaOverride ? settings.schemaOverride: false;
    this.schemaDirectory = settings && settings.schemaDirectory ? settings.schemaDirectory : false;
  }
};

module.exports = FranchiseFileSettings;