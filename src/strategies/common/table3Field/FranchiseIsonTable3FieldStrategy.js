import zlib from 'zlib';
import { IsonProcessor } from '../../../services/isonProcessor.js';

let FranchiseTable3FieldStrategy = {};
const DEFAULT_GAME_YEAR = 25;
const isonProcessorCache = new Map();

function getGameYear(context) {
    return context?.gameYear || DEFAULT_GAME_YEAR;
}

function getIsonProcessor(gameYear) {
    if (isonProcessorCache.has(gameYear)) {
        return isonProcessorCache.get(gameYear);
    }

    const processor = new IsonProcessor(gameYear);
    isonProcessorCache.set(gameYear, processor);
    return processor;
}

FranchiseTable3FieldStrategy.getZlibDataStartIndex = (unformattedValue) => {
    return unformattedValue.indexOf(Buffer.from([0x1f, 0x8b]));
};

FranchiseTable3FieldStrategy.getInitialUnformattedValue = (field, data) => {
    return data.slice(
        field.thirdTableField.index,
        field.thirdTableField.index + field.offset.maxLength + 2
    );
    // extend maxLength + 2 because the first 2 bytes are the size of the zipped data
};

FranchiseTable3FieldStrategy.getFormattedValueFromUnformatted = (
    unformattedValue,
    strategyContext
) => {
    const isonProcessor = getIsonProcessor(getGameYear(strategyContext));
    // First two bytes are the size of the zipped data, so skip those and get the raw ISON buffer
    const zlibDataStartIndex =
        FranchiseTable3FieldStrategy.getZlibDataStartIndex(unformattedValue);
    const isonBuf = zlib.gunzipSync(
        unformattedValue.subarray(zlibDataStartIndex)
    );
    // Convert the ISON buffer to a JSON object using the class instance
    const jsonObj = isonProcessor.isonVisualsToJson(isonBuf);
    return JSON.stringify(jsonObj);
};

FranchiseTable3FieldStrategy.setUnformattedValueFromFormatted = (
    formattedValue,
    oldUnformattedValue,
    maxLength,
    strategyContext
) => {
    const isonProcessor = getIsonProcessor(getGameYear(strategyContext));
    // Parse the JSON string into a JSON object
    let jsonObj = JSON.parse(formattedValue);
    // Convert the object into an ISON buffer using the class instance
    let isonBuf = isonProcessor.jsonVisualsToIson(jsonObj);
    let padding = Buffer.alloc(maxLength - isonBuf.length); // table3s all have the same length and are zero padded to the end.
    let sizeBuf = Buffer.alloc(2);
    sizeBuf.writeUInt16LE(isonBuf.length);
    return Buffer.concat([sizeBuf, isonBuf, padding]);
};

export default FranchiseTable3FieldStrategy;
