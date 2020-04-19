const utilService = require('./services/utilService');

class FranchiseEnumValue {
  constructor(name, index, value, unformattedValue) {
    this._name = name;
    this._index = typeof(index) === 'number' ? index : parseInt(index);
    this._value = typeof(value) === 'number' ? value : parseInt(value);
    this._unformattedValue = unformattedValue ? unformattedValue : parseFormattedValue(parseInt(value));
  };

  get name () {
    return this._name;
  };

  get index () {
    return this._index;
  };

  get value () {
    return this._value;
  };

  get unformattedValue () {
    return this._unformattedValue;
  };

  setMemberLength(length) {
    if (this.value < 0) {
      this._unformattedValue = '1' + this._unformattedValue.padStart(length - 1, '0');
    }
    else {
      this._unformattedValue = this._unformattedValue.padStart(length, '0');
    }
  };
};

module.exports = FranchiseEnumValue;

function parseFormattedValue(value) {
  if (value < 0) {
    return utilService.dec2bin((value*-1) - 1);
  }
  
  return utilService.dec2bin(value);
};