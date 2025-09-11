import utilService from "./services/utilService.js";
const emptyRef = '00000000000000000000000000000000';

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
        
        // Attempt to set the unformatted value normally using the strategy
        // If the new unformatted value is too big, utilize an overflow record for the excess data
        // Otherwise, clear the overflow reference
        let newUnformattedValue = this._strategy.setUnformattedValueFromFormatted(value, this._unformattedValue, this.maxLength);
        if(newUnformattedValue.length > this.maxLength + 2)
        {
            // Get the portion of data that we will be writing to the current record's field
            newUnformattedValue = this.populateOverflowRecord(newUnformattedValue);
        }
        else
        {
            this.clearOverflowRecord();
        }
        this._unformattedValue = newUnformattedValue;
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

    populateOverflowRecord(newUnformattedValue) {
        // Get the portion of data that fits within the main record
        const mainFieldData = newUnformattedValue.slice(0, this.maxLength + 2);

        // Get the extra data for the overflow record (overflow data does not include the size bytes)
        const overflowData = newUnformattedValue.slice(this.maxLength + 2);

        // Get the parent field and parent table for the current table3 field
        const field = this.fieldReference;
        const record = field.parent;
        const table = record.parent;

        // Get existing value of Overflow field to see if we already have an overflow record assigned
        const overflowRecord = utilService.getTable3OverflowRecord(record);

        // If the overflow record is assigned and is in this table, use it
        if(overflowRecord)
        {
            overflowRecord.getFieldByKey(field.key).thirdTableField.unformattedValue = overflowData;
        }
        else // Otherwise, get the next available record in the table, if there is one, and assign it as the overflow record
        {
            const nextRecordIndex = table.header.nextRecordToUse;

            // If the table has space
            if(nextRecordIndex != table.header.recordCapacity)
            {
                // Update the Overflow reference of the current record to point to the new overflow record
                const reference = utilService.getBinaryReferenceData(table.header.tableId, nextRecordIndex);
                field.parent.getFieldByKey('Overflow').value = reference;

                // Unempty the overflow record and set the data
                table.records[nextRecordIndex].getFieldByKey('Overflow').value = emptyRef;
                table.records[nextRecordIndex].getFieldByKey(field.key).thirdTableField.unformattedValue = overflowData;
            }
        }

        // Return the data to be written to the current record
        return mainFieldData;

    }

    clearOverflowRecord() {
        // Get the current overflow reference
        const overflowRef = this.fieldReference.parent.getFieldByKey('Overflow').value;

        if(overflowRef === emptyRef)
        {
            return;
        }

        const field = this.fieldReference;
        const record = field.parent;
        const table = record.parent;

        // If the referenced record is in the current table, clear it out and empty it
        const overflowRecord = utilService.getTable3OverflowRecord(record);

        if(overflowRecord)
        {
            overflowRecord.getFieldByKey(field.key).value = {};
            overflowRecord.empty();
        }

        // Clear the overflow reference
        record.getFieldByKey('Overflow').value = emptyRef;
        
    }
}
;
function getLengthOfUnformattedValue(value) {
    return value.length;
}
;
export default FranchiseFileTable3Field;
