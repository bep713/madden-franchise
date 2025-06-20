const FranchiseEnumValue = require('./FranchiseEnumValue');

class FranchiseEnum {
  /** @param {string | FranchiseEnum} name @param {number} assetId @param {boolean} isRecordPersistent */
  constructor(name, assetId, isRecordPersistent) {
    if (typeof name === 'object') {
      const theEnum = name;
      /** @private */
      this._name = theEnum._name;
      /** @private */
      this._assetId = theEnum._assetId;
      /** @private */
      this._isRecordPersistent = theEnum._isRecordPersistent;
      /** @private */
      this._members = [];

      for (let i = 0; i < theEnum._members.length; i++) {
        const member = theEnum._members[i];
        this.addMember(member._name, member._index, member._value, member._unformattedValue);
      }

      this._maxLength = this._members[0].unformattedValue.length;
    } else {
      this._name = name;
      this._assetId = assetId;
      this._isRecordPersistent = isRecordPersistent
      this._members = [];
      this._maxLength = -1;
    }
  };

  /** @returns {string} */
  get name () {
    return this._name;
  };

  /** @returns {number} */
  get assetId () {
    return this._assetId;
  };

  /** @returns {boolean} */
  get isRecordPersistent () {
    return this._isRecordPersistent;
  };

  /** @returns {Array<FranchiseEnumValue>} */
  get members () {
    return this._members;
  }

  /** @param {string} name @param {number} index @param {string} value @param {string?} [unformattedValue] */
  addMember(name, index, value, unformattedValue) {
    this._members.push(new FranchiseEnumValue(name, index, value, unformattedValue));
  };

  /** @param {string} value @returns {FranchiseEnumValue?} */
  getMemberByValue(value) {
    const matches = this._members.filter((member) => { return member.name !== 'First_' && member.name !== 'Last_' && member.value === value; });
    if (matches.length === 0) { throw new Error(`Argument is not a valid enum value for this field. You passed in ${value}. Field name: ${this.name}`); }

    const matchesNoUnderscore = matches.find((member) => { return member.name[member.name.length - 1] !== '_'});    
    return matchesNoUnderscore ? matchesNoUnderscore : matches[0];
  };

  /** @param {string} value @returns {FranchiseEnumValue?} */
  getMemberByUnformattedValue(value) {
    if (value.length > this._maxLength) {
      const valueToCutOff = value.substring(0, value.length - this._maxLength);

      // if the user passes in 100000, but the enum's max value is only 5 digits...we need to throw an error.
      const cutOffContainsData = /[a-zA-Z1-9]/.test(valueToCutOff);
      if(cutOffContainsData) {
        throw new Error(`Argument is not a valid enum value for this field. You passed in ${value}. Field name: ${this.name}`);
      } 

      value = value.substring(value.length - this._maxLength)
    }

    const matches = this._members.filter((member) => { return member.name !== 'First_' && member.name !== 'Last_' && member.unformattedValue === value; });
    if (matches.length === 0) { throw new Error(`Argument is not a valid enum value for this field. You passed in ${value}. Field name: ${this.name}`); }

    const matchesNoUnderscore = matches.find((member) => { return member.name[member.name.length - 1] !== '_'});    
    return matchesNoUnderscore ? matchesNoUnderscore : matches[0];
  };
  
  /** @param {string} name @returns {FranchiseEnumValue?} */
  getMemberByName(name) {
    return this._members.find((member) => { return member.name.toLowerCase() === name.toLowerCase(); });
  };

  setMemberLength() {
    if (this._members.length === 0) {
      return;
    }

    const maxValue = this._members.reduce((accum, currentVal) => {
      return (accum.value > currentVal.value ? accum : currentVal);
    });

    const hasNegativeNumbers = this._members.find((member) => { return member.value < 0; });

    this._maxLength = hasNegativeNumbers ? maxValue.unformattedValue.length + 1 : maxValue.unformattedValue.length;

    this._members.forEach((member) => {
      member.setMemberLength(this._maxLength);
    });
  };
};

module.exports = FranchiseEnum;