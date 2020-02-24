const EventEmitter = require('events').EventEmitter;
const utilService = require('./services/utilService');

class FranchiseFileTable2Field extends EventEmitter {
  constructor (index, maxLength) {
    super();
    this._value = '';
    this.rawIndex = index;
    this.isChanged = false;
    this.maxLength = maxLength;
    this.fieldReference = null;
    this.lengthAtLastSave = null;
    this._unformattedValue = null;
    this.index = utilService.bin2dec(index);
    this._offset = this.index;
  };

  get unformattedValue () {
    return this._unformattedValue;
  };

  set unformattedValue (value) {
    this._unformattedValue = value;

    if (this.lengthAtLastSave === null) {
      this.lengthAtLastSave = getLengthOfUnformattedValue(this._unformattedValue);
    }
    
    let formattedValue = '';
    const chunked = utilService.chunk(this._unformattedValue, 8);
    chunked.forEach((chunk) => {
      formattedValue += String.fromCharCode(parseInt(chunk,2));
    });

    this._value = formattedValue.replace(/\0.*$/g,'');
    this.emit('change');
  };

  get value () {
    return this._value;
  };

  set value (value) {
    if (value.length > this.maxLength) {
      value = value.substring(0, this.maxLength);
    }
    
    this._value = value;
    this._unformattedValue = this._strategy.setUnformattedValueFromFormatted(value, this.maxLength);

    if (this.lengthAtLastSave === null) {
      this.lengthAtLastSave = getLengthOfUnformattedValue(this._unformattedValue);
    }
    
    this.emit('change');
  };

  get hexData () {
    return Buffer.from(utilService.binaryBlockToDecimalBlock(this.unformattedValue));
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
      this.fieldReference.unformattedValue = utilService.dec2bin(offset, 32);
    }
  };
};

module.exports = FranchiseFileTable2Field;

function getLengthOfUnformattedValue(value) {
    return value.length / 8;
};