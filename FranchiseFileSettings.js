class FranchiseFileSettings {
  constructor(settings) {
    this.saveOnChange = settings ? settings.saveOnChange : false;
    this.schemaOverride = settings ? settings.schemaOverride : false;
    this.schemaDirectory = settings ? settings.schemaDirectory : false;
  }
};

module.exports = FranchiseFileSettings;