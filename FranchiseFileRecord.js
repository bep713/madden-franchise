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
    const unformattedValue = data.slice(offset.offset, offset.offset + offset.length);
    fields.push(new FranchiseFileField(offset.name, unformattedValue, offset));
  }

  return fields;
};