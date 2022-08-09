const utilService = require('../../../services/utilService');

let FranchiseTable2FieldStrategy = {};

FranchiseTable2FieldStrategy.getInitialUnformattedValue = (field, data) => {
    return data.slice(field.secondTableField.index, (field.secondTableField.index + field.offset.maxLength));
};

FranchiseTable2FieldStrategy.setUnformattedValueFromFormatted = (formattedValue, maxLength) => {
    let valuePadded = formattedValue;

    if (valuePadded.length > maxLength) {
        valuePadded = valuePadded.substring(0, maxLength);
    }
    
    const numberOfNullCharactersToAdd = maxLength - formattedValue.length;
    
    for (let i = 0; i < numberOfNullCharactersToAdd; i++) {
        valuePadded += String.fromCharCode(0);
    }

    return Buffer.from(valuePadded);
};

module.exports = FranchiseTable2FieldStrategy;