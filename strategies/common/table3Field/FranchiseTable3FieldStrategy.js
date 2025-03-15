const zlib = require('zlib');
const TDB2Converter = require('../../../services/TDB2Converter');

let FranchiseTable3FieldStrategy = {};

FranchiseTable3FieldStrategy.getZlibDataStartIndex = (unformattedValue) => {
    return unformattedValue.indexOf(Buffer.from([0x1F, 0x8B]));
};

FranchiseTable3FieldStrategy.getInitialUnformattedValue = (field, data) => {
    return data.slice(field.thirdTableField.index, (field.thirdTableField.index + field.offset.maxLength + 2));
    // extend maxLength + 2 because the first 2 bytes are the size of the zipped data
};

FranchiseTable3FieldStrategy.getFormattedValueFromUnformatted = (unformattedValue) => {
    const zlibDataStartIndex = FranchiseTable3FieldStrategy.getZlibDataStartIndex(unformattedValue);

    // first few bytes are the size of the zipped data & other flags, so skip those.
    const decompressedData = zlib.gunzipSync(unformattedValue.subarray(zlibDataStartIndex));

    // If the size is followed by 0x7 before the gzip-compressed data, the decompressed data is in TDB2 format, so use the TDB2 converter
    if(unformattedValue[2] === 0x7)
    {
        const jsonData = TDB2Converter.readChviRecord(decompressedData);

        return JSON.stringify(jsonData);
    }

    // Otherwise, it's a standard JSON, so just convert the buffer to a string
    return decompressedData.toString();
};

FranchiseTable3FieldStrategy.setUnformattedValueFromFormatted = (formattedValue, oldUnformattedValue, maxLength) => {
    let zippedData = zlib.gzipSync(formattedValue);
    let padding = Buffer.alloc(maxLength - zippedData.length);  // table3s all have the same length and are zero padded to the end.

    let sizeBuf = Buffer.alloc(2);
    sizeBuf.writeUInt16LE(zippedData.length);

    return Buffer.concat([sizeBuf, zippedData, padding]);
};

module.exports = FranchiseTable3FieldStrategy;