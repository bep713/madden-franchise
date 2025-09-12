import { BitView } from "bit-buffer";
import utilService from "./services/utilService.js";
import FranchiseFileTable2Field from "./FranchiseFileTable2Field.js";
import FranchiseFileTable3Field from "./FranchiseFileTable3Field.js";
class FranchiseFileField {
    /** @param {string} key @param {Buffer} value @param {OffsetTableEntry} offset @param {FranchiseFileRecord} parent */
    constructor(key, value, offset, parent) {
        /** @private */
        this._key = key;
        /** @private */
        this._recordBuffer = value;
        /** @private */
        this._unformattedValue = null;
        /** @private */
        this._offset = offset;
        /** @private */
        this._parent = parent;
        /** @private */
        this._isChanged = false;
        if (offset.valueInSecondTable) {
            /** @type {FranchiseFileTable2Field?} */
            this.secondTableField = new FranchiseFileTable2Field(this._recordBuffer.readUInt32BE(offset.offset / 8), offset.maxLength);
            this.secondTableField.fieldReference = this;
        }
        if (offset.valueInThirdTable) {
            /** @type {FranchiseFileTable3Field?} */
            this.thirdTableField = new FranchiseFileTable3Field(this._recordBuffer.readUInt32BE(offset.offset / 8), offset.maxLength);
            this.thirdTableField.fieldReference = this;
        }
    }
    ;
    /** @returns {string} */
    get key() {
        return this._key;
    }
    ;
    /** @returns {OffsetTableEntry} */
    get offset() {
        return this._offset;
    }
    ;
    /** @returns {*} */
    get value() {
        if (this._unformattedValue === null) {
            this._setUnformattedValueIfEmpty();
        }
        if (this._value === null) {
            this._value = this._parseFieldValue(this._unformattedValue, this._offset);
        }
        return this._value;
    }
    ;
    /** @returns {boolean} */
    get isReference() {
        return this._offset.isReference;
    }
    ;
    /** @returns {RecordReference?} */
    get referenceData() {
        if (this._unformattedValue === null) {
            this._setUnformattedValueIfEmpty();
        }
        if (this.isReference) {
            return utilService.getReferenceDataFromBitview(this._unformattedValue, this.offset.offset);
        }
        return null;
    }
    ;
    set value(value) {
        if (this._unformattedValue === null) {
            this._setUnformattedValueIfEmpty();
        }
        this._value = value;
        this.isChanged = true;
        if (this.offset.valueInSecondTable) {
            this.secondTableField.value = value.toString();
        }
        else if (this.offset.valueInThirdTable) {
            if (typeof value === 'object') {
                const newVal = JSON.stringify(value);
                this._value = newVal;
                this.thirdTableField.value = newVal;
            }
            else {
                this.thirdTableField.value = value.toString();
            }
        }
        else {
            let actualValue;
            if (this.offset.isReference) {
                if (!utilService.isString(value)) {
                    throw new Error(`Argument must be of type string. You passed in a ${typeof unformattedValue}.`);
                }
                else if (!utilService.stringOnlyContainsBinaryDigits(value)) {
                    throw new Error(`Argument must only contain binary digits 1 and 0. If you would like to set the value, please set the 'value' attribute instead.`);
                }
                const referenceData = utilService.getReferenceData(value);
                this._unformattedValue.setBits(this.offset.offset, referenceData.tableId, 15);
                this._unformattedValue.setBits((this.offset.offset + 15), referenceData.rowNumber, 17);
            }
            else if (this.offset.enum) {
                try {
                    let theEnum = this._getEnumFromValue(value);
                    // Enums can have negative values and Madden negative numbers are not standard. We need to convert it here.
                    // Ex: In Madden, binary "1000" = -1 for an enum with a max length of 4. But for everything else, "1000" = 8, so we need to get the "real" value here.
                    const decimalEquivalent = utilService.bin2dec(theEnum.unformattedValue);
                    this._unformattedValue.setBits(this.offset.offset, decimalEquivalent, this.offset.length);
                    this._value = theEnum.name;
                }
                catch (err) {
                    // if user tries entering an invalid enum value, check if it's an empty record reference (will be binary)
                    if (utilService.stringOnlyContainsBinaryDigits(value)) {
                        this._value = value;
                        this._unformattedValue.setBits(this.offset.offset, value, this.offset.length);
                    }
                    else {
                        this._value = null;
                        throw err;
                    }
                }
            }
            else {
                switch (this.offset.type) {
                    case 's_int':
                        actualValue = parseInt(value);
                        this._value = actualValue;
                        this._unformattedValue.setBits(this.offset.offset, actualValue - this.offset.minValue, this.offset.length);
                        break;
                    default:
                    case 'int':
                        actualValue = parseInt(value);
                        this._value = actualValue;
                        if (this.offset.minValue || this.offset.maxValue) {
                            // return utilService.dec2bin(formatted, offset.length);
                            this._unformattedValue.setBits(this.offset.offset, actualValue, this.offset.length);
                        }
                        else {
                            const maxValueBinary = getMaxValueBinary(this.offset);
                            const maxValue = utilService.bin2dec(maxValueBinary);
                            // return utilService.dec2bin(formatted + maxValue, offset.length);
                            this._unformattedValue.setBits(this.offset.offset, actualValue + maxValue, this.offset.length);
                        }
                        break;
                    case 'bool':
                        // return (formatted == 1 || (formatted.toString().toLowerCase() == 'true')) ? '1' : '0';
                        actualValue = (value == 1 || (value.toString().toLowerCase() == 'true'));
                        this._value = actualValue;
                        this._unformattedValue.setBits(this.offset.offset + (this.offset.length - 1), actualValue, 1);
                        break;
                    case 'float':
                        actualValue = parseFloat(value);
                        this._value = actualValue;
                        // return utilService.float2Bin(formatted);
                        // this._unformattedValue.setBits(this.offset.offset, value, this.offset.length);
                        this._unformattedValue.setFloat32(this.offset.offset, actualValue);
                        break;
                }
            }
            this._parent.onEvent('change', this);
        }
    }
    ;
    /** @returns {BitView} */
    get unformattedValue() {
        if (this._unformattedValue === null) {
            this._setUnformattedValueIfEmpty();
        }
        return this._unformattedValue;
    }
    ;
    /** @param {BitView} unformattedValue */
    set unformattedValue(unformattedValue) {
        this.setUnformattedValueWithoutChangeEvent(unformattedValue);
        this._value = null;
        this._parent.onEvent('change', this);
    }
    ;
    /** @returns {boolean} */
    get isChanged() {
        return this._isChanged;
    }
    ;
    /** @param {boolean} changed */
    set isChanged(changed) {
        this._isChanged = changed;
    }
    ;

    /** @returns {FranchiseFileRecord} */
    get parent() {
        return this._parent;
    }

    /** @param {OffsetTableEntry} offset */
    getValueAs(offset) {
        if (this._unformattedValue === null) {
            this._setUnformattedValueIfEmpty();
        }
        return this._parseFieldValue(this._unformattedValue, offset);
    }
    _bubbleChangeToParent() {
        this._parent.onEvent('change', this);
    }
    ;
    clearCachedValues() {
        this._value = null;
        this._unformattedValue = null;
    }
    ;
    _setUnformattedValueIfEmpty() {
        this._value = null;
        this._unformattedValue = new BitView(this._recordBuffer, this._recordBuffer.byteOffset);
        this._unformattedValue.bigEndian = true;
    }
    ;
    /** @param {BitView} unformattedValue */
    setUnformattedValueWithoutChangeEvent(unformattedValue) {
        if (!(unformattedValue instanceof BitView)) {
            throw new Error(`Argument must be of type BitView. You passed in a(n) ${typeof unformattedValue}.`);
        }
        else {
            this._unformattedValue = unformattedValue;
            this._value = null;
        }
    }
    /** @returns {FranchiseEnumValue?} */
    _getEnumFromValue(value) {
        const enumName = this.offset.enum.getMemberByName(value);
        if (enumName) {
            return enumName;
        }
        else {
            const formattedEnum = this.offset.enum.getMemberByValue(value);
            if (formattedEnum) {
                return formattedEnum;
            }
            else {
                const unformattedEnum = this.offset.enum.getMemberByUnformattedValue(value);
                if (unformattedEnum) {
                    return unformattedEnum;
                }
                else {
                    return this.offset.enum.members[0];
                }
            }
        }
    }
    ;
    /** @param {BitView} unformatted, @param {OffsetTableEntry} offset */
    _parseFieldValue(unformatted, offset) {
        if (offset.valueInSecondTable) {
            return this.secondTableField.value;
        }
        else if (offset.valueInThirdTable) {
            return this.thirdTableField.value;
        }
        else if (offset.enum) {
            const enumUnformattedValue = utilService.dec2bin(unformatted.getBits(offset.offset, offset.length), offset.enum._maxLength);
            try {
                const theEnum = offset.enum.getMemberByUnformattedValue(enumUnformattedValue);
                if (theEnum) {
                    return theEnum.name;
                }
            }
            catch {
                // console.log(err);
            }
            return enumUnformattedValue;
        }
        else if (offset.isReference) {
            try {
                const referenceData = utilService.getReferenceDataFromBitview(unformatted, offset.offset);
                return utilService.getBinaryReferenceData(referenceData.tableId, referenceData.rowNumber);
            }
            catch {
                console.warn(`Tried to read ${offset.name} as a reference, but received an error.`);
                // tried to read a reference, but the offset was incorrect
                return unformatted.getBits(offset.offset, offset.length);
            }
        }
        else {
            switch (offset.type) {
                case 's_int':
                    // return utilService.bin2dec(unformatted) + offset.minValue;
                    return unformatted.getBits(offset.offset, offset.length) + offset.minValue;
                case 'int':
                    if (offset.minValue || offset.maxValue) {
                        return unformatted.getBits(offset.offset, offset.length);
                    }
                    else {
                        // This is for int[] tables.
                        const maxValueBinary = getMaxValueBinary(offset);
                        const maxValue = utilService.bin2dec(maxValueBinary);
                        const newValue = unformatted.getBits(offset.offset, offset.length);
                        if (newValue === 0) {
                            return 0;
                        }
                        else {
                            return newValue - maxValue;
                        }
                    }
                case 'bool':
                    return unformatted.getBits(offset.offset + (offset.length - 1), 1) ? true : false;
                case 'float':
                    // return utilService.bin2Float(unformatted);
                    return unformatted.getFloat32(offset.offset, offset.length);
                default:
                    return unformatted;
            }
        }
    }
    ;
}
;
function getMaxValueBinary(offset) {
    let maxValue = '1';
    for (let j = 0; j < (offset.length - 1); j++) {
        maxValue += '0';
    }
    return maxValue;
}
;
export default FranchiseFileField;
