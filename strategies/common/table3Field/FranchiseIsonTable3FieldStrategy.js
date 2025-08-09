const zlib = require('zlib');
const ISON_FUNCTIONS = require('../../../services/isonFunctions')

let FranchiseTable3FieldStrategy = {};

FranchiseTable3FieldStrategy.getZlibDataStartIndex = (unformattedValue) => {
    return unformattedValue.indexOf(Buffer.from([0x1F, 0x8B]));
};

FranchiseTable3FieldStrategy.getInitialUnformattedValue = (field, data) => {
    return data.slice(field.thirdTableField.index, (field.thirdTableField.index + field.offset.maxLength + 2));
    // extend maxLength + 2 because the first 2 bytes are the size of the zipped data
};

FranchiseTable3FieldStrategy.getFormattedValueFromUnformatted = (unformattedValue) => {
    // First two bytes are the size of the zipped data, so skip those and get the raw ISON buffer
    const zlibDataStartIndex = FranchiseTable3FieldStrategy.getZlibDataStartIndex(unformattedValue);
    const isonBuf = zlib.gunzipSync(unformattedValue.subarray(zlibDataStartIndex));

    // Convert the ISON buffer to a JSON object
    const jsonObj = ISON_FUNCTIONS.isonVisualsToJson(isonBuf, 25);

    return JSON.stringify(jsonObj);   
};

FranchiseTable3FieldStrategy.setUnformattedValueFromFormatted = (formattedValue, oldUnformattedValue, maxLength) => {
    // Parse the JSON string into a JSON object
    let jsonObj = JSON.parse(formattedValue);

    // Convert the object into an ISON buffer
    let isonBuf = ISON_FUNCTIONS.jsonVisualsToIson(jsonObj, 25);

    let padding = Buffer.alloc(maxLength - isonBuf.length);  // table3s all have the same length and are zero padded to the end.

    let sizeBuf = Buffer.alloc(2);
    sizeBuf.writeUInt16LE(isonBuf.length);

    return Buffer.concat([sizeBuf, isonBuf, padding]);
};

module.exports = FranchiseTable3FieldStrategy;