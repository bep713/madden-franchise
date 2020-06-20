const EventEmitter = require('events').EventEmitter;
const utilService = require('./services/utilService');
const FranchiseFileField = require('./FranchiseFileField');
const { start } = require('repl');

class FranchiseFileRecord extends EventEmitter {
  constructor(data, index, offsetTable) {
    super();
    this._data = data;
    this._offsetTable = offsetTable;
    this.index = index;
    this._fields = parseRecordFields(data, offsetTable);
    this.isChanged = false;

    const that = this;
    this._fields.forEach((field) => {
      Object.defineProperty(this, field.key, {
        set: function (value) {
          field.value = value;
        },
        get: function () {
          return field.value;
        }
      });

      field.on('change', function () {
        that._data = utilService.replaceAt(that._data, this.offset.offset, this.unformattedValue);
        that.emit('change');
      });
    });
  };

  get hexData () {
    return Buffer.from(utilService.binaryBlockToDecimalBlock(this._data));
  };

  getFieldByKey(key) {
    return this._fields.find((field) => { return field.key === key; });
  };

  getValueByKey(key) {
    let field = this.getFieldByKey(key);
    return field ? field.value : null;
  };

  getReferenceDataByKey(key) {
    let field = this.getFieldByKey(key);
    return field ? field.referenceData : null;
  };

  get fields () {
    return this._fields;
  };
};

module.exports = FranchiseFileRecord;

function parseRecordFields (data, offsetTable) {
  let fields = [];

  for (let j = 0; j < offsetTable.length; j++) {
    const offset = offsetTable[j];

    // Get the starting byte and the ending byte. If a field's length is 32 bits, and offset is 0...
    // The lowestByteIndex would be 0 and the highestByteIndex would be 3. (Remember, it's zero based)

    // Ex2: length=3, offset=10. lowestByteIndex=1, highestByteIndex=1. 
    // Offset of 10 means we are on the 2nd byte (so the answer=1 because zero-based)
    // The field is 3 bits long, so the ending offset is 13 which is still inside the 2nd byte.

    const lowestByteIndex = Math.floor(offset.offset / 8);
    const highestByteIndex = Math.floor((offset.offset + offset.length) / 8);

    // Get the relevant bytes for this field
    const relevantBytes = data.subarray(lowestByteIndex, highestByteIndex+1);
    
    // Find the starting and ending bit. If the offset is 10, the starting bit would be 2.
    // If the length is 4, the ending bit would be 6.
    const startingBit = offset.offset % 8;
    const endingBit = startingBit + offset.length;
    const numBytes = relevantBytes.length;

    // Read the byte into an integer field
    const rawInteger = relevantBytes.readUIntBE(0, numBytes);

    // Find the amount to shift right. We want to remove any bits after the ending bit.
    // If starting bit = 2 and length = 4, the amountToShiftRight would be 2.
    const amountToShiftRight = ((numBytes*8) - endingBit);

    // Find the value to AND to the above integer field. We need to AND out the bits before the starting bit.
    // If starting bit = 2 and length = 4, the valueToAND would be 00111100. We want to remove the first two bits and we do that by ANDing them.
    // We also want to remove the last bits (though this isn't necessary because we are shifting right, so therefore the trailing bits could be 1 or 0, i chose 0)
    let strValueToAND = '';

    for (let i = 0; i < offset.length; i++) {
      strValueToAND += '1';
    }

    for (let i = 0; i < amountToShiftRight; i++) {
      strValueToAND += '0';
    }

    const valueToAND = parseInt(strValueToAND, 2);
    const unformattedValue = (rawInteger & valueToAND) >>> amountToShiftRight;

    fields.push(new FranchiseFileField(offset.name, unformattedValue, offset));
  }

  return fields;
};