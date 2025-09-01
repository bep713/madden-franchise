class FranchiseFileTable3Field {
    /** @param {number} index @param {number} maxLength @param {FranchiseFileTable} parent */
    constructor(index, maxLength, parent) {
        /** @private */
        this._value = '';
        /** @type {number} */
        this.rawIndex = index;
        this.isChanged = false;
        this.maxLength = maxLength;
        /** @type {FranchiseFileField} */
        this.fieldReference = null;
        /** @type {number} */
        this.lengthAtLastSave = null;
        /** @private */
        this._unformattedValue = null;
        this.index = index;
        this._offset = this.index;
        this._parent = parent;
    }
    ;
    get unformattedValue() {
        return this._unformattedValue;
    }
    ;
    set unformattedValue(value) {
        this._unformattedValue = value;
        if (this.lengthAtLastSave === null) {
            this.lengthAtLastSave = getLengthOfUnformattedValue(this._unformattedValue);
        }
        this._value = null;
        if (this._parent) {
            this._parent.onEvent('change', this);
        }
    }
    ;
    get value() {
        if (this._value === null) {
            this._value = this._strategy.getFormattedValueFromUnformatted(this._unformattedValue);
        }
        return this._value;
    }
    ;
    set value(value) {
        this._value = value;
        this._unformattedValue = this._strategy.setUnformattedValueFromFormatted(value, this._unformattedValue, this.maxLength);
        if (this.lengthAtLastSave === null) {
            this.lengthAtLastSave = getLengthOfUnformattedValue(this._unformattedValue);
        }
        this._parent.onEvent('change', this);
    }
    ;
    get hexData() {
        return this._unformattedValue;
    }
    ;
    /** @type {Table3FieldStrategy} */
    get strategy() {
        return this._strategy;
    }
    ;
    /** @param {Table3FieldStrategy} strategy */
    set strategy(strategy) {
        this._strategy = strategy;
    }
    ;
    /** @returns {number} */
    get offset() {
        return this._offset;
    }
    ;
    /** @param {number} offset */
    set offset(offset) {
        this._offset = offset;
        this.index = offset;
        if (this.fieldReference) {
            this.fieldReference.unformattedValue.setBits(this.fieldReference.offset.offset, offset, 32);
        }
    }
    ;
    get parent() {
        return this._parent;
    }
    ;
    /** @param {FranchiseFileTable} parent */
    set parent(parent) {
        this._parent = parent;
    }
    ;
}
;
function getLengthOfUnformattedValue(value) {
    return value.length;
}
;
export default FranchiseFileTable3Field;
