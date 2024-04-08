const utilService = require('./services/utilService');

class FranchiseEnumValue {
  /** @param {string} name @param {number} index @param {string} value @param {string?} [unformattedValue] */
  constructor(name, index, value, unformattedValue) {
    /** @private */
    this._name = name;
    /** @private */
    this._index = typeof(index) === 'number' ? index : parseInt(index);
    /** @private */
    this._value = typeof(value) === 'number' ? value : parseInt(value);
    /** @private */
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

  /** @returns {string?} */
  get unformattedValue () {
    return this._unformattedValue;
  };

  /** @param {number} length */
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