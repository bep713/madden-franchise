import FranchiseFileField from './FranchiseFileField.js';

/**
 * @typedef {import('./FranchiseFileTable.js').OffsetTableEntry} OffsetTableEntry
 * @typedef {import('./FranchiseFileTable.js').default} FranchiseFileTable
 * @typedef {import('./FranchiseFile.js').RecordReference} RecordReference
 */
class FranchiseFileRecord {
    /** @param {Buffer} data @param {number} index @param {OffsetTableEntry} offsetTable, @param {FranchiseFileTable} parent */
    constructor(data, index, offsetTable, parent) {
        /** @type {Buffer}  */
        this._data = data;
        /** @type {OffsetTableEntry} */
        this._offsetTable = offsetTable;
        /** @type {number} */
        this.index = index;
        /** @private @type {Array<FranchiseFileField>} */
        this._fieldsArray = [];
        /** @private @type {Record<string, FranchiseFileField>} */
        this._fields = this.parseRecordFields();
        this._isChanged = false;
        /** @type {number} */
        this.arraySize = null;
        this.isEmpty = false;
        /** @type {FranchiseFileTable} */
        this._parent = parent;
        return new Proxy(this, {
            get: function (target, prop) {
                return target.fields[prop] !== undefined
                    ? target.fields[prop].value
                    : target[prop] !== undefined
                      ? target[prop]
                      : null;
            },
            set: function (target, prop, receiver) {
                if (target.fields[prop] !== undefined) {
                    target.fields[prop].value = receiver;
                } else {
                    target[prop] = receiver;
                }
                return true;
            }
        });
    }
    /** @returns {Buffer} */
    get hexData() {
        return this._data;
    }
    /** @returns {Record<string, FranchiseFileField>} */
    get fields() {
        return this._fields;
    }
    /** @returns {Array<FranchiseFileField>} */
    get fieldsArray() {
        return this._fieldsArray;
    }
    /** @returns {Buffer} */
    get data() {
        return this._data;
    }
    /** @param {Buffer} data */
    set data(data) {
        this._data = data;
        this._fieldsArray.forEach((field) => {
            const unformattedValue = data.slice(
                field.offset.offset,
                field.offset.offset + field.offset.length
            );
            field.setUnformattedValueWithoutChangeEvent(unformattedValue);
        });
    }
    get isChanged() {
        return this._isChanged;
    }
    /** @param {boolean} changed */
    set isChanged(changed) {
        this._isChanged = changed;
        if (changed === false) {
            this.fieldsArray.forEach((field) => {
                field.isChanged = false;
            });
        }
    }

    /** @returns {FranchiseFileTable} */
    get parent() {
        return this._parent;
    }

    /** @param {string} key @returns {FranchiseFileField?} */
    getFieldByKey(key) {
        return this._fields[key];
    }
    /** @param {string} key @returns {*?} */
    getValueByKey(key) {
        let field = this.getFieldByKey(key);
        return field ? field.value : null;
    }
    /** @param {string} key @returns {RecordReference?} */
    getReferenceDataByKey(key) {
        let field = this.getFieldByKey(key);
        return field ? field.referenceData : null;
    }
    /** @returns {Record<string, FranchiseFileField>} */
    parseRecordFields() {
        let fields = {};
        this._fieldsArray = [];
        for (let j = 0; j < this._offsetTable.length; j++) {
            const offset = this._offsetTable[j];
            // Push the entire record buffer to the field. No need to perform a calculation
            // to subarray the buffer, BitView will take care of it in the Field.
            fields[offset.name] = new FranchiseFileField(
                offset.name,
                this._data,
                offset,
                this
            );
            this._fieldsArray.push(fields[offset.name]);
        }
        return fields;
    }
    empty() {
        this._parent.onEvent('empty', this);
        this.isEmpty = true;
    }
    /** @param {string} name @param {FranchiseFileField} field */
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
                        if (
                            referenceData.tableId !== 0 ||
                            referenceData.rowNumber !== 0
                        ) {
                            this.arraySize = field.offset.index + 1;
                        }
                    }
                }
                // If the value was changed to 0s, then shrink the array size to field index.
                else if (field.isReference) {
                    if (
                        referenceData.tableId === 0 &&
                        referenceData.rowNumber === 0
                    ) {
                        this.arraySize = field.offset.index;
                    }
                }
            }
            this._parent.onEvent('change', this);
        }
    }
}
export default FranchiseFileRecord;
