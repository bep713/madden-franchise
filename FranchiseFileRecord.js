const utilService = require('./services/utilService');
const FranchiseFileField = require('./FranchiseFileField');

class FranchiseFileRecord {
  constructor(data, index, offsetTable, parent) {
    this._data = data;
    this._offsetTable = offsetTable;
    this.index = index;
    this._fields = parseRecordFields(data, offsetTable, this);
    this.isChanged = false;
    this.arraySize = null;
    this.isEmpty = false;
    this._parent = parent;
  };

  get hexData () {
    // return Buffer.from(utilService.binaryBlockToDecimalBlock(this._data));
    return this._data;
  };

  get fields () {
    return this._fields;
  };

  get fieldsArray () {
    return Object.keys(this._fields).map((key) => {
      return this._fields[key];
    });
  };

  set data (data) {
    this._data = data;

    Object.keys(this._fields).map((key) => {
      return this._fields[key];
    }).forEach((field) => {
      const unformattedValue = data.slice(field.offset.offset, field.offset.offset + field.offset.length);
      field.setUnformattedValueWithoutChangeEvent(unformattedValue);
    });
  };

  empty() {
    this._parent.onEvent('empty', this);
    this.isEmpty = true;
  };

  onEvent(name, field) {
    if (name === 'change') {
      // this._data = utilService.replaceAt(this._data, field.offset.offset, field.unformattedValue);

      // NOTE: At field time, we can only change the size of arrays of references.
      // I'm not sure how to change the size of non-reference arrays, or if it's even possible.
      if (this.arraySize !== null && this.arraySize !== undefined) {
        const referenceData = field.referenceData;

        // If the field is outside of the previous array size and was edited to a valid reference,
        // then reset the array size
        if (field.offset.index >= this.arraySize) {
          if (field.isReference) {
            if (referenceData.tableId !== 0 || referenceData.rowNumber !== 0) {
              this.arraySize = field.offset.index + 1;
            }
          }
        }
        
        // If the value was changed to 0s, then shrink the array size to field index.
        else if (field.isReference) {
          if (referenceData.tableId === 0 && referenceData.rowNumber === 0) {
            this.arraySize = field.offset.index;
          }
        }
      }

      this._parent.onEvent('change', this);
    }
  };
};

module.exports = FranchiseFileRecord;

function parseRecordFields(data, offsetTable, record) {
  let fields = {};

  for (let j = 0; j < offsetTable.length; j++) {
    const offset = offsetTable[j];
    // const unformattedValue = data.slice(offset.offset, offset.offset + offset.length);
    fields[offset.name] = new FranchiseFileField(offset.name, data, offset, record);
  }

  return fields;
};