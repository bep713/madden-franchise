class FranchiseFileSettings {
  constructor(settings) {
    this.saveOnChange = settings ? settings.saveOnChange : false;
    this.schemaOverride = settings ? settings.schemaOverride : false;
  }
};

module.exports = FranchiseFileSettings;