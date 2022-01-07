const EventEmitter = require('events').EventEmitter;
const utilService = require('./services/utilService');
const FranchiseFileField = require('./FranchiseFileField');

class FranchiseFileRecord extends EventEmitter {
  constructor(data, index, offsetTable) {
    super();
    this._data = data;
    this._offsetTable = offsetTable;
    this.index = index;
    this._fields = parseRecordFields(data, offsetTable);
    this.isChanged = false;
    this.arraySize = null;
    this.isEmpty = false;

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

        // NOTE: At this time, we can only change the size of arrays of references.
        // I'm not sure how to change the size of non-reference arrays, or if it's even possible.
        if (that.arraySize !== null && that.arraySize !== undefined) {
          const referenceData = this.referenceData;

          // If the field is outside of the previous array size and was edited to a valid reference,
          // then reset the array size
          if (this.offset.index >= that.arraySize) {
            if (this.isReference) {
              if (referenceData.tableId !== 0 || referenceData.rowNumber !== 0) {
                that.arraySize = this.offset.index + 1;
              }
            }
          }
          
          // If the value was changed to 0s, then shrink the array size to this index.
          else if (this.isReference) {
            if (referenceData.tableId === 0 && referenceData.rowNumber === 0) {
              that.arraySize = this.offset.index;
            }
          }
        }

        that.emit('change', this.offset);
      });
    });
  };

  get hexData () {
    return Buffer.from(utilService.binaryBlockToDecimalBlock(this._data));
  };

  get fields () {
    return this._fields;
  };

  set data (data) {
    this._data = data;

    this._fields.forEach((field) => {
      const unformattedValue = data.slice(field.offset.offset, field.offset.offset + field.offset.length);
      field.setUnformattedValueWithoutChangeEvent(unformattedValue, true);
    });
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

  empty() {
    this.emit('empty');
    this.isEmpty = true;
  };
};

module.exports = FranchiseFileRecord;

function parseRecordFields (data, offsetTable) {
  let fields = [];

  for (let j = 0; j < offsetTable.length; j++) {
    const offset = offsetTable[j];
    const unformattedValue = data.slice(offset.offset, offset.offset + offset.length);
    fields.push(new FranchiseFileField(offset.name, unformattedValue, offset));
  }

  return fields;
};