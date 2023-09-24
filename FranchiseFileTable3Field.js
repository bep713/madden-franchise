const EventEmitter = require('events').EventEmitter;
const utilService = require('./services/utilService');

class FranchiseFileTable3Field {
  constructor (index, maxLength, parent) {
    this._value = '';
    this.rawIndex = index;
    this.isChanged = false;
    this.maxLength = maxLength;
    this.fieldReference = null;
    this.lengthAtLastSave = null;
    this._unformattedValue = null;
    this.index = index;
    this._offset = this.index;
    this._parent = parent;
  };

  get unformattedValue () {
    return this._unformattedValue;
  };

  set unformattedValue (value) {
    this._unformattedValue = value;

    if (this.lengthAtLastSave === null) {
      this.lengthAtLastSave = getLengthOfUnformattedValue(this._unformattedValue);
    }

    this._value = null;
    if (this._parent) {
      this._parent.onEvent('change', this);
    }
  };

  get value () {
    if (this._value === null) {
      this._value = this._strategy.getFormattedValueFromUnformatted(this._unformattedValue);
    }

    return this._value;
  };

  set value (value) {
    this._value = value;    
    this._unformattedValue = this._strategy.setUnformattedValueFromFormatted(value, this.maxLength);

    if (this.lengthAtLastSave === null) {
      this.lengthAtLastSave = getLengthOfUnformattedValue(this._unformattedValue);
    }
    
    this._parent.onEvent('change', this);
  };

  get hexData () {
    return this._unformattedValue;
  };

  get strategy () {
    return this._strategy;
  };

  set strategy (strategy) {
    this._strategy = strategy;
  };

  get offset () {
    return this._offset;
  };

  set offset (offset) {
    this._offset = offset;
    this.index = offset;

    if (this.fieldReference) {
      this.fieldReference.unformattedValue.setBits(this.fieldReference.offset.offset, offset, 32);
    }
  };

  get parent() {
    return this._parent;
  };

  set parent(parent) {
    this._parent = parent;
  };
};

module.exports = FranchiseFileTable3Field;

function getLengthOfUnformattedValue(value) {
    return value.length;
};