const { BitView } = require('bit-buffer');

const utilService = require('./services/utilService');
const FranchiseFileTable2Field = require('./FranchiseFileTable2Field');

class FranchiseFileField {
  constructor(key, value, offset, parent) {
    this._key = key;
    this._recordBuffer = value;
    this._unformattedValue = null;
    // this._unformattedValue = value;
    // this._value = parseFieldValue(value, offset);
    this._offset = offset;
    // console.log(parent);
    this._parent = parent;

    if (offset.valueInSecondTable) {
      // console.log(this._recordBuffer.length, offset.offset / 8);
      this.secondTableField = new FranchiseFileTable2Field(this._recordBuffer.readUInt32BE(offset.offset / 8), offset.maxLength);
      this.secondTableField.fieldReference = this;
    }
  };

  get key () {
    return this._key;
  };

  get offset () {
    return this._offset;
  };

  get value () {
    if (this._unformattedValue === null) {
      this._setUnformattedValueIfEmpty();
    }

    return this._parseFieldValue(this._unformattedValue, this._offset);
  };

  get isReference () {
    return this._offset.isReference;
  };

  get referenceData () {
    if (this._unformattedValue === null) {
      this._setUnformattedValueIfEmpty();
    }

    if (this.isReference) {
      return utilService.getReferenceDataFromBitview(this._unformattedValue, this.offset.offset);
    }
    
    return null;
  };

  set value (value) {
    if (this._unformattedValue === null) {
      this._setUnformattedValueIfEmpty();
    }

    if (this.offset.valueInSecondTable) {
      this.secondTableField.value = value.toString();
    } else {
      let actualValue;

      if (this.offset.isReference) {
        if (!utilService.isString(value)) { throw new Error(`Argument must be of type string. You passed in a ${typeof unformattedValue}.`); }
        else if (!utilService.stringOnlyContainsBinaryDigits(value)) { throw new Error(`Argument must only contain binary digits 1 and 0. If you would like to set the value, please set the 'value' attribute instead.`)}
        const referenceData = utilService.getReferenceData(value);
        this._unformattedValue.setBits(this.offset.offset, referenceData.tableId, 15);
        this._unformattedValue.setBits((this.offset.offset + 15), referenceData.rowNumber, 17);
      }
      else if (this.offset.enum) {
        let theEnum = this._getEnumFromValue(value);

        // Enums can have negative values and Madden negative numbers are not standard. We need to convert it here.
        // Ex: In Madden, binary "1000" = -1 for an enum with a max length of 4. But for everything else, "1000" = 8, so we need to get the "real" value here.
        const decimalEquivalent = utilService.bin2dec(theEnum.unformattedValue);
        this._unformattedValue.setBits(this.offset.offset, decimalEquivalent, this.offset.length);
      }
      else {
        switch (this.offset.type) {
          case 's_int':
            actualValue = parseInt(value);
            this._unformattedValue.setBits(this.offset.offset, actualValue, this.offset.length);
            break;
          default:
          case 'int':
            if (this.offset.minValue || this.offset.maxValue) {
              // return utilService.dec2bin(formatted, offset.length);
              this._unformattedValue.setBits(this.offset.offset, value, this.offset.length);
            }
            else {
              const maxValueBinary = getMaxValueBinary(this.offset);
              const maxValue = utilService.bin2dec(maxValueBinary);
              // return utilService.dec2bin(formatted + maxValue, offset.length);
              this._unformattedValue.setBits(this.offset.offset, value + maxValue, this.offset.length);
            }
            break;
          case 'bool':
            // return (formatted == 1 || (formatted.toString().toLowerCase() == 'true')) ? '1' : '0';
            actualValue = (value == 1 || (value.toString().toLowerCase() == 'true'));
            this._unformattedValue.setBits(this.offset.offset, actualValue, 1);
            break;
          case 'float':
            // return utilService.float2Bin(formatted);
            // this._unformattedValue.setBits(this.offset.offset, value, this.offset.length);
            this._unformattedValue.setFloat32(this.offset.offset, value);
            break;
        }
      }

      // this._value = setFormattedValue(value, this._offset);
      // this._unformattedValue = parseFormattedValue(value, this._offset);


      // this.emit('change');
      this._parent.onEvent('change', this);
    }
  };

  get unformattedValue () {
    this._setUnformattedValueIfEmpty();
    return this._unformattedValue;
  };

  set unformattedValue (unformattedValue) {
    this.setUnformattedValueWithoutChangeEvent(unformattedValue);
    // this.emit('change');
    this._parent.onEvent('change', this);
  };

  _setUnformattedValueIfEmpty() {
    this._unformattedValue = new BitView(this._recordBuffer, this._recordBuffer.byteOffset);
    this._unformattedValue.bigEndian = true;
  };

  setUnformattedValueWithoutChangeEvent(unformattedValue, suppressErrors) {
    if (!utilService.isString(unformattedValue)) { throw new Error(`Argument must be of type string. You passed in a ${typeof unformattedValue}.`); }
    else if (!utilService.stringOnlyContainsBinaryDigits(unformattedValue)) { throw new Error(`Argument must only contain binary digits 1 and 0. If you would like to set the value, please set the 'value' attribute instead.`)}
    else {
      let value;

      if (this.offset.valueInSecondTable) {
        // value = this.secondTableField.value;
      }
      else {
        // value = this._parseFieldValue(unformattedValue.padStart(this._offset.length, '0'), this._offset);
      }

      // check for 'allowed' error - this will be true if the unformatted value is invalid.
      if (this._offset.enum && value === unformattedValue.padStart(this._offset.length, '0') && !suppressErrors) {
        throw new Error(`Argument is not a valid unformatted value for this field. You passed in ${value}.`)
      }

      // this._value = value;

      // if (this._offset.enum) {
        // this._unformattedValue = this._offset.enum.getMemberByName(this._value).unformattedValue.padStart(this._offset.length, '0');
      // } 
      // else {
        this._unformattedValue = unformattedValue;
      // }
    }
  }

  _getEnumFromValue(value) {
    const enumName = this.offset.enum.getMemberByName(value);
    
    if (enumName) {
      return enumName;
    } 
    else {
      const formattedEnum = this.offset.enum.getMemberByValue(value)

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
  };

  _parseFieldValue(unformatted, offset) {
    if (offset.valueInSecondTable) {
      return this.secondTableField.value;
    }
    else if (offset.enum) {
      try {
        const enumUnformattedValue = utilService.dec2bin(this.unformattedValue.getBits(this.offset.offset, this.offset.length), offset.enum._maxLength);
        const theEnum = offset.enum.getMemberByUnformattedValue(enumUnformattedValue);
  
        if (theEnum) {
          return theEnum.name;
        }
      }
      catch (err) {
        console.log(err);
      }
      
      return unformatted;
    }
    else if (offset.isReference) {
      const referenceData = utilService.getReferenceDataFromBitview(this._unformattedValue, this.offset.offset);
      return utilService.getBinaryReferenceData(referenceData.tableId, referenceData.rowNumber);
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
          return unformatted.getBits(offset.offset, 1) ? true : false;
        case 'float':
          // return utilService.bin2Float(unformatted);
          return unformatted.getFloat32(offset.offset, offset.length);
        default:
          return unformatted;
      }
    }
  };
};

module.exports = FranchiseFileField;

function setFormattedValue(value, offset) {
  if (offset.enum) {
    const theEnum = offset.enum.getMemberByName(value);
    if (!theEnum) {
      const theEnumByValue = offset.enum.getMemberByValue(value);

      if (!theEnumByValue) {
        throw new Error(`Argument is not a valid enum value for this field. You passed in ${value}.`);
      }
      else {
        return theEnumByValue.name;
      }
    } else {
      return theEnum.name;
    }
  }

  switch (offset.type) {
    case 's_int':
    case 'int':
      return parseInt(value);
    case 'bool':
      return value == 1 || (value.toString().toLowerCase() == 'true');
    case 'float':
      return parseFloat(value);
    default:
      return value.toString();
  }
};

function parseFormattedValue(formatted, offset) {
  if (offset.enum) {
    const enumName = offset.enum.getMemberByName(formatted);

    if (enumName) {
      return enumName.unformattedValue.padStart(offset.length, '0');
    } 
    else {
      const formattedEnum = offset.enum.getMemberByValue(formatted)

      if (formattedEnum) {
        return formattedEnum.unformattedValue.padStart(offset.length, '0');
      } 
      else {
        const unformattedEnum = offset.enum.getMemberByUnformattedValue(formatted);

        if (unformattedEnum) {
          return unformattedEnum.unformattedValue.padStart(offset.length, '0');
        } 
        else {
          return offset.enum.members[0].unformattedValue.padStart(offset.length, '0');
        }
      }
    }
  }
  else {
    switch (offset.type) {
      case 's_int':
        const actualValue = parseInt(formatted);
        return utilService.dec2bin(actualValue - offset.minValue, offset.length);
      case 'int':
        if (offset.minValue || offset.maxValue) {
          return utilService.dec2bin(formatted, offset.length);
        }
        else {
          const maxValueBinary = getMaxValueBinary(offset);
          const maxValue = utilService.bin2dec(maxValueBinary);
          return utilService.dec2bin(formatted + maxValue, offset.length);
        }
      case 'bool':
        return (formatted == 1 || (formatted.toString().toLowerCase() == 'true')) ? '1' : '0';
      case 'float':
        return utilService.float2Bin(formatted);
      default:
        return formatted;
    }
  }
};

function getMaxValueBinary(offset) {
  let maxValue = '1';
  for (let j = 0; j < (offset.length - 1); j++) {
    maxValue += '0';
  }
  return maxValue;
};