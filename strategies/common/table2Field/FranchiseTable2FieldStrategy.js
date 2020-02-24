const utilService = require('../../../services/utilService');

let FranchiseTable2FieldStrategy = {};

FranchiseTable2FieldStrategy.getInitialUnformattedValue = (field, data) => {
    return utilService.getBitArray(data.slice(field.secondTableField.index, (field.secondTableField.index + field.offset.maxLength)));
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
    
    return valuePadded.split('').map((char) => {
        return char.charCodeAt(0).toString(2).padStart(8, '0');
    }).join('');
};

module.exports = FranchiseTable2FieldStrategy;