const EventEmitter = require('events').EventEmitter;
const utilService = require('./services/utilService');
const FranchiseFileTable2Field = require('./FranchiseFileTable2Field');

class FranchiseFileField extends EventEmitter {
  constructor(key, value, offset) {
    super();
    this._key = key;
    this._unformattedValue = value;
    this._value = parseFieldValue(value, offset);
    this._offset = offset;

    if (offset.valueInSecondTable) {
      this.secondTableField = new FranchiseFileTable2Field(value, offset.maxLength);
      this.secondTableField.fieldReference = this;

      this.secondTableField.on('change', function () {
        this._value = this.secondTableField.value;
      }.bind(this));
    }
  };

  get key () {
    return this._key;
  };

  get offset () {
    return this._offset;
  };

  get value () {
    return this._value;
  };

  get isReference () {
    return this._offset.isReference;
  };

  get referenceData () {
    if (this.isReference) {
      return utilService.getReferenceData(this.value);
    }
    
    return null;
  };

  set value (value) {
    if (this.offset.valueInSecondTable) {
      this.secondTableField.value = value.toString();
    } else {
      if (this.offset.isReference) {
        if (!utilService.isString(value)) { throw new Error(`Argument must be of type string. You passed in a ${typeof unformattedValue}.`); }
        else if (!utilService.stringOnlyContainsBinaryDigits(value)) { throw new Error(`Argument must only contain binary digits 1 and 0. If you would like to set the value, please set the 'value' attribute instead.`)}
      }

      this._value = setFormattedValue(value, this._offset);
      this._unformattedValue = parseFormattedValue(value, this._offset);
      this.emit('change');
    }
  };

  get unformattedValue () {
    return this._unformattedValue;
  };

  set unformattedValue (unformattedValue) {
    this.setUnformattedValueWithoutChangeEvent(unformattedValue);
    this.emit('change');
  };

  setUnformattedValueWithoutChangeEvent(unformattedValue, suppressErrors) {
    if (!utilService.isString(unformattedValue)) { throw new Error(`Argument must be of type string. You passed in a ${typeof unformattedValue}.`); }
    else if (!utilService.stringOnlyContainsBinaryDigits(unformattedValue)) { throw new Error(`Argument must only contain binary digits 1 and 0. If you would like to set the value, please set the 'value' attribute instead.`)}
    else {
      let value;

      if (this.offset.valueInSecondTable) {
        value = this.secondTableField.value;
      }
      else {
        value = parseFieldValue(unformattedValue.padStart(this._offset.length, '0'), this._offset);
      }

      // check for 'allowed' error - this will be true if the unformatted value is invalid.
      if (this._offset.enum && value === unformattedValue.padStart(this._offset.length, '0') && !suppressErrors) {
        throw new Error(`Argument is not a valid unformatted value for this field. You passed in ${value}.`)
      }

      this._value = value;

      if (this._offset.enum) {
        this._unformattedValue = this._offset.enum.getMemberByName(this._value).unformattedValue.padStart(this._offset.length, '0');
      } 
      else {
        this._unformattedValue = unformattedValue;
      }
    }
  }
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

function parseFieldValue(unformatted, offset) {
  if (offset.enum) {
    try {
      const theEnum = offset.enum.getMemberByUnformattedValue(unformatted);

      if (theEnum) {
        return theEnum.name;
      }
    }
    catch (err) {
      // console.log(err);
    }
    
    return unformatted;
  }
  else {
    switch (offset.type) {
      case 's_int':
        return utilService.bin2dec(unformatted) + offset.minValue;
      case 'int':
        if (offset.minValue || offset.maxValue) {
          return utilService.bin2dec(unformatted);
        }
        else {
          const maxValueBinary = getMaxValueBinary(offset);
          const maxValue = utilService.bin2dec(maxValueBinary);
          const newValue = utilService.bin2dec(unformatted);
          
          if (newValue === 0) {
            return 0;
          }
          else {
            return newValue - maxValue;
          }
        }
      case 'bool':
        return unformatted[0] === '1' ? true : false;
      case 'float':
        return utilService.bin2Float(unformatted);
      default:
        return unformatted;
    }
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