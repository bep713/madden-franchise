class FranchiseFileSettings {
  constructor(settings) {
    this.saveOnChange = settings ? settings.saveOnChange : false;
  }
};

module.exports = FranchiseFileSettings;