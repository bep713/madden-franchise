import FranchiseFileField from './FranchiseFileField.js';

/**
 * @typedef {import('./FranchiseFileTable.js').OffsetTableEntry} OffsetTableEntry
 * @typedef {import('./FranchiseFileTable.js').default} FranchiseFileTable
 * @typedef {import('./FranchiseFile.js').RecordReference} RecordReference
 */
/** @type {WeakMap<OffsetTableEntry[], Map<string, number>>} */
const fieldIndexCache = new WeakMap();
/**
 * Maps each field name to its offset table index. On duplicate names the last index wins,
 * matching the `fields` object, which keeps the last field created for a name.
 * @param {OffsetTableEntry[]} offsetTable @returns {Map<string, number>}
 */
function getFieldIndexes(offsetTable) {
    let indexes = fieldIndexCache.get(offsetTable);
    if (!indexes) {
        indexes = new Map();
        offsetTable.forEach((offset, index) => indexes.set(offset.name, index));
        fieldIndexCache.set(offsetTable, indexes);
    }
    return indexes;
}
// Reading this key through the proxy returns the raw record, so internal code can skip the traps
const RAW_RECORD = Symbol('rawRecord');
// One handler shared by every record proxy, so constructing a record allocates no closures
const recordProxyHandler = {
    get: function (target, prop) {
        if (prop === RAW_RECORD) {
            return target;
        }
        const index = getFieldIndexes(target._offsetTable).get(prop);
        if (index !== undefined) {
            return target._getFieldAt(index).value;
        }
        return target[prop] !== undefined ? target[prop] : null;
    },
    set: function (target, prop, receiver) {
        const index = getFieldIndexes(target._offsetTable).get(prop);
        if (index !== undefined) {
            target._getFieldAt(index).value = receiver;
        } else {
            target[prop] = receiver;
        }
        return true;
    }
};
class FranchiseFileRecord {
    /** @param {Buffer} data @param {number} index @param {OffsetTableEntry} offsetTable, @param {FranchiseFileTable} parent */
    constructor(data, index, offsetTable, parent) {
        /** @type {Buffer}  */
        this._data = data;
        /** @type {OffsetTableEntry} */
        this._offsetTable = offsetTable;
        /** @type {number} */
        this.index = index;
        // Fields are created lazily: one at a time by key (_getField), or all at once on first
        // access of fields/fieldsArray. _fieldCache holds every field created so far, by offset index.
        /** @private @type {Array<FranchiseFileField>?} */
        this._fieldCache = null;
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
        return new Proxy(this, recordProxyHandler);
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
        // Fields not created yet will read from the new buffer when created
        this._forEachCreatedField((field) => {
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
            this._forEachCreatedField((field) => {
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
        const index = getFieldIndexes(this._offsetTable).get(key);
        return index !== undefined ? this._getFieldAt(index) : undefined;
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
        for (let j = 0; j < this._offsetTable.length; j++) {
            // Reuse fields created earlier by key, the table2/3 passes hold references to them
            const field = this._getFieldAt(j);
            fields[field.key] = field;
            fieldsArray.push(field);
        }
        this._fieldCache = fieldsArray;
        this._fieldsArrayCache = fieldsArray;
        this._fieldsCache = fields;
        return fields;
    }
    /** Internal (also used by FranchiseFileTable): creates the field at an offset index on first use. @param {number} index @returns {FranchiseFileField} */
    _getFieldAt(index) {
        // Called through the proxy, `this` is the proxy: switch to the raw record. Fields get the
        // raw record as parent, same as fields created by the trap or by parseRecordFields.
        const self = this[RAW_RECORD] || this;
        if (self._fieldCache === null) {
            self._fieldCache = new Array(self._offsetTable.length);
        }
        let field = self._fieldCache[index];
        if (field === undefined) {
            const offset = self._offsetTable[index];
            // Push the entire record buffer to the field. No need to perform a calculation
            // to subarray the buffer, BitView will take care of it in the Field.
            field = new FranchiseFileField(offset.name, self._data, offset, self);
            self._fieldCache[index] = field;
        }
        return field;
    }
    /** @private @param {(field: FranchiseFileField) => void} callback */
    _forEachCreatedField(callback) {
        if (this._fieldCache === null) {
            return;
        }
        for (let i = 0; i < this._fieldCache.length; i++) {
            if (this._fieldCache[i] !== undefined) {
                callback(this._fieldCache[i]);
            }
        }
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
        this._forEachCreatedField((field) => field.clearCachedValues());
    }
}
export default FranchiseFileRecord;
