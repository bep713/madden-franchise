const utilService = require('../../../services/utilService');

let FTCTable2FieldStrategy = {};

FTCTable2FieldStrategy.getInitialUnformattedValue = (field, data) => {
    let fieldData = data.slice(field.secondTableField.index, (field.secondTableField.index + field.offset.maxLength));
    const endOfFieldIndex = fieldData.indexOf(0x00);

    if (endOfFieldIndex >= 0) {
        // if there's a match, break the string early, making sure to include the 0s from the '00'.
        // All table2 fields include the trailing 0x00.
        fieldData = fieldData.slice(0, endOfFieldIndex + 1);
    }

    return fieldData;
};

FTCTable2FieldStrategy.setUnformattedValueFromFormatted = (formattedValue, maxLength) => {
    if (formattedValue.length >= maxLength) {
        // FTC strings cannot equal max length because the last character must be the null character.
        formattedValue = formattedValue.substring(0, maxLength - 1);
    }

    return Buffer.from(formattedValue + '\u0000');
};

module.exports = FTCTable2FieldStrategy;