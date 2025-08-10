const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
const { Decoder } = require('@toondepauw/node-zstd');
const { IsonProcessor } = require('../../../services/isonProcessor')

let FranchiseZstdTable3FieldStrategy = {};
let dictionary = fs.readFileSync(path.join(__dirname, '../../../data/zstd-dicts/26/dict.bin'));
const zstdDecoder = new Decoder(dictionary);

// Create a single IsonProcessor instance for M26 and reuse it for better performance
const isonProcessor = new IsonProcessor(26);

FranchiseZstdTable3FieldStrategy.getZstdDataStartIndex = (unformattedValue) => {
    return unformattedValue.indexOf(Buffer.from([0x28, 0xB5, 0x2F, 0xFD]));
};

FranchiseZstdTable3FieldStrategy.getInitialUnformattedValue = (field, data) => {
    return data.slice(field.thirdTableField.index, (field.thirdTableField.index + field.offset.maxLength + 2));
    // extend maxLength + 2 because the first 2 bytes are the size of the compressed data
};

FranchiseZstdTable3FieldStrategy.getFormattedValueFromUnformatted = (unformattedValue) => {
    // First two bytes are the size of the zipped data, so skip those and get the raw ISON buffer
    const zstdDataStartIndex = FranchiseZstdTable3FieldStrategy.getZstdDataStartIndex(unformattedValue);

    // Zstd decoder cannot handle extra padding bytes, so we need to get the exact number of bytes
    const length = unformattedValue.readUInt16LE(0);
    const isonBuf = zstdDecoder.decodeSync(unformattedValue.subarray(zstdDataStartIndex, zstdDataStartIndex + length));

    // Convert the ISON buffer to a JSON object using the class instance
    const jsonObj = isonProcessor.isonVisualsToJson(isonBuf);

    return JSON.stringify(jsonObj);   
};

FranchiseZstdTable3FieldStrategy.setUnformattedValueFromFormatted = (formattedValue, oldUnformattedValue, maxLength) => {
    // Parse the JSON string into a JSON object
    let jsonObj = JSON.parse(formattedValue);

    // Convert the object into an ISON buffer using the class instance
    let isonBuf = isonProcessor.jsonVisualsToIson(jsonObj);

    // Create the zstd-compressed buffer (not using dictionary due to node limitations, game still reads it fine)
    const compressedBuf = zlib.zstdCompressSync(isonBuf);

    let padding = Buffer.alloc(maxLength - compressedBuf.length);  // table3s all have the same length and are zero padded to the end.

    let sizeBuf = Buffer.alloc(2);
    sizeBuf.writeUInt16LE(compressedBuf.length);

    return Buffer.concat([sizeBuf, compressedBuf, padding]);
};

module.exports = FranchiseZstdTable3FieldStrategy;