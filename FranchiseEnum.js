const FranchiseEnumValue = require('./FranchiseEnumValue');

class FranchiseEnum {
  constructor(name, assetId, isRecordPersistent) {
    if (typeof name === 'object') {
      const theEnum = name;
      this._name = theEnum._name;
      this._assetId = theEnum._assetId;
      this._isRecordPersistent = theEnum._isRecordPersistent;
      this._members = [];

      for (let i = 0; i < theEnum._members.length; i++) {
        const member = theEnum._members[i];
        this.addMember(member._name, member._index, member._value, member._unformattedValue);
      }
    } else {
      this._name = name;
      this._assetId = assetId;
      this._isRecordPersistent = isRecordPersistent
      this._members = [];
    }
  };

  get name () {
    return this._name;
  };

  get assetId () {
    return this._assetId;
  };

  get isRecordPersistent () {
    return this._isRecordPersistent;
  };

  get members () {
    return this._members;
  }

  addMember(name, index, value, unformattedValue) {
    this._members.push(new FranchiseEnumValue(name, index, value, unformattedValue));
  };

  getMemberByValue(value) {
    return this._members.find((member) => { return member.name !== 'First_' && member.name !== 'Last_' && member.value === value; });
  };

  getMemberByUnformattedValue(value) {
    return this._members.find((member) => { return member.name !== 'First_' && member.name !== 'Last_' && member.unformattedValue === value; });
  };
  
  getMemberByName(name) {
    return this._members.find((member) => { return member.name === name; });
  };

  setMemberLength() {
    const maxValue = this._members.reduce((accum, currentVal) => {
      return (accum.value > currentVal.value ? accum : currentVal);
    });

    this._members.forEach((member) => {
      member.setMemberLength(maxValue.unformattedValue.length);
    });
  };
};

module.exports = FranchiseEnum;