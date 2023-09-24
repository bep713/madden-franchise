const zlib = require('zlib');

let FranchiseTable3FieldStrategy = {};

FranchiseTable3FieldStrategy.getInitialUnformattedValue = (field, data) => {
    return data.slice(field.thirdTableField.index, (field.thirdTableField.index + field.offset.maxLength + 2)); 
    // extend maxLength + 2 because the first 2 bytes are the size of the zipped data
};

FranchiseTable3FieldStrategy.getFormattedValueFromUnformatted = (unformattedValue) => {
    return zlib.gunzipSync(unformattedValue.subarray(2)).toString();    // first 2 bytes are the size of the zipped data, so skip those.
};

FranchiseTable3FieldStrategy.setUnformattedValueFromFormatted = (formattedValue, maxLength) => {
    let zippedData = zlib.gzipSync(formattedValue);
    let padding = Buffer.alloc(maxLength - zippedData.length);  // table3s all have the same length and are zero padded to the end.

    let sizeBuf = Buffer.alloc(2);
    sizeBuf.writeUInt16LE(zippedData.length);

    return Buffer.concat([sizeBuf, zippedData, padding]);
};

module.exports = FranchiseTable3FieldStrategy;