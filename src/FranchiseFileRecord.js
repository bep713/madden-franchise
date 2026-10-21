import FranchiseFileField from './FranchiseFileField.js';

/**
 * @typedef {import('./FranchiseFileTable.js').OffsetTableEntry} OffsetTableEntry
 * @typedef {import('./FranchiseFileTable.js').default} FranchiseFileTable
 * @typedef {import('./FranchiseFile.js').RecordReference} RecordReference
 */
/** @type {WeakMap<OffsetTableEntry[], Set<string>>} */
const fieldNameCache = new WeakMap();
/** @param {OffsetTableEntry[]} offsetTable @returns {Set<string>} */
function getFieldNames(offsetTable) {
    let names = fieldNameCache.get(offsetTable);
    if (!names) {
        names = new Set(offsetTable.map((offset) => offset.name));
        fieldNameCache.set(offsetTable, names);
    }
    return names;
}
class FranchiseFileRecord {
    /** @param {Buffer} data @param {number} index @param {OffsetTableEntry} offsetTable, @param {FranchiseFileTable} parent */
    constructor(data, index, offsetTable, parent) {
        /** @type {Buffer}  */
        this._data = data;
        /** @type {OffsetTableEntry} */
        this._offsetTable = offsetTable;
        /** @type {number} */
        this.index = index;
        // Fields are created lazily on first access of fields/fieldsArray
        /** @private @type {Array<FranchiseFileField>?} */
        this._fieldsArrayCache = null;
        /** @private @type {Record<string, FranchiseFileField>?} */
        this._fieldsCache = null;
        this._isChanged = false;
        /** @type {number} */
        this.arraySize = null;
        this.isEmpty = false;
        /** @type {FranchiseFileTable} */
        this._parent = parent;
        const fieldNames = getFieldNames(offsetTable);
        return new Proxy(this, {
            get: function (target, prop) {
                if (fieldNames.has(prop)) {
                    return target.fields[prop].value;
                }
                return target[prop] !== undefined ? target[prop] : null;
            },
            set: function (target, prop, receiver) {
                if (fieldNames.has(prop)) {
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
    /** @private @returns {Record<string, FranchiseFileField>} */
    get _fields() {
        if (this._fieldsCache === null) {
            this._fieldsCache = this.parseRecordFields();
        }
        return this._fieldsCache;
    }
    /** @private @returns {Array<FranchiseFileField>} */
    get _fieldsArray() {
        if (this._fieldsArrayCache === null) {
            this.parseRecordFields();
        }
        return this._fieldsArrayCache;
    }
    /** @returns {Buffer} */
    get data() {
        return this._data;
    }
    /** @param {Buffer} data */
    set data(data) {
        this._data = data;
        // Unmaterialized fields will read from the new buffer when created
        if (this._fieldsArrayCache === null) {
            return;
        }
        this._fieldsArrayCache.forEach((field) => {
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
        if (changed === false && this._fieldsArrayCache !== null) {
            this._fieldsArrayCache.forEach((field) => {
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
        return this.fields[key];
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
        const fieldsArray = [];
        this._fieldsArrayCache = fieldsArray;
        this._fieldsCache = fields;
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
            fieldsArray.push(fields[offset.name]);
        }
        return fields;
    }
    empty() {
        // Clear cached field values because the empty record may change the first 4 data bytes
        this.clearCachedFieldValues();
        // Trigger the empty event
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
    clearCachedFieldValues() {
        if (this._fieldsArrayCache !== null) {
            this._fieldsArrayCache.forEach((field) => field.clearCachedValues());
        }
    }
}
export default FranchiseFileRecord;
