const utilService = require('./services/utilService');
const FranchiseFileField = require('./FranchiseFileField');

class FranchiseFileRecord {
  constructor(data, index, offsetTable, parent) {
    this._data = data;
    this._offsetTable = offsetTable;
    this.index = index;
    this._fieldsArray = [];
    this._fields = this.parseRecordFields(data, offsetTable, this);
    this.isChanged = false;
    this.arraySize = null;
    this.isEmpty = false;
    this._parent = parent;

    return new Proxy(this, {
      get: function (target, prop, receiver) {
        return target.fields[prop] !== undefined ? target.fields[prop].value : target[prop] !== undefined ? target[prop] : null;
      },
      set: function (target, prop, receiver) {
        if (target.fields[prop] !== undefined) {
          target.fields[prop].value = receiver;
        }
        else {
          target[prop] = receiver;
        }

        return true;
      }
    })
  };

  get hexData () {
    return this._data;
  };

  get fields () {
    return this._fields;
  };

  get fieldsArray () {
    return this._fieldsArray;
  };

  get data() {
    return this._data;
  };

  set data (data) {
    this._data = data;

    this._fieldsArray.forEach((field) => {
      const unformattedValue = data.slice(field.offset.offset, field.offset.offset + field.offset.length);
      field.setUnformattedValueWithoutChangeEvent(unformattedValue);
    });
  };

  getFieldByKey(key) {
    return this._fields[key];
  };

  getValueByKey(key) {
    let field = this.getFieldByKey(key);
    return field ? field.value : null;
  };

  getReferenceDataByKey(key) {
    let field = this.getFieldByKey(key);
    return field ? field.referenceData : null;
  };

  parseRecordFields(data, offsetTable, record) {
    let fields = {};
  
    for (let j = 0; j < offsetTable.length; j++) {
      const offset = offsetTable[j];

      // Push the entire record buffer to the field. No need to perform a calculation
      // to subarray the buffer, BitView will take care of it in the Field.
      fields[offset.name] = new FranchiseFileField(offset.name, data, offset, record);

      this._fieldsArray.push(fields[offset.name]);
    }
  
    return fields;
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