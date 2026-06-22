import zlib from 'zlib';
import fs from 'fs';
import path, { dirname } from 'path';
import { IsonProcessor } from '../../../services/isonProcessor.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let FranchiseZstdTable3FieldStrategy = {};
const DEFAULT_GAME_YEAR = 26;
const DEFAULT_GAME_TYPE = 'madden';
const dictionaryCache = new Map();
const isonProcessorCache = new Map();

function getGameYear(context) {
    return context?.gameYear || DEFAULT_GAME_YEAR;
}

function getGameType(context) {
    return context?.gameType || DEFAULT_GAME_TYPE;
}

function getDictionary(gameYear, gameType) {
    const cacheKey = `${gameYear}_${gameType}`;
    if (dictionaryCache.has(cacheKey)) {
        return dictionaryCache.get(cacheKey);
    }

    const dirKey = (gameType === 'college' ? 'c' : '') + gameYear;

    const dictPath = path.join(
        __dirname,
        `../../../../data/zstd-dicts/${dirKey}/dict.bin`
    );
    const fallbackPath = path.join(
        __dirname,
        `../../../../data/zstd-dicts/${DEFAULT_GAME_YEAR}/dict.bin`
    );
    const filePath = fs.existsSync(dictPath) ? dictPath : fallbackPath;
    const dictionary = fs.readFileSync(filePath);
    dictionaryCache.set(cacheKey, dictionary);
    return dictionary;
}

function getIsonProcessor(gameYear, gameType) {
    const cacheKey = `${gameYear}_${gameType}`;
    if (isonProcessorCache.has(cacheKey)) {
        return isonProcessorCache.get(cacheKey);
    }

    const processor = new IsonProcessor(gameYear, gameType);
    isonProcessorCache.set(cacheKey, processor);
    return processor;
}

FranchiseZstdTable3FieldStrategy.getZstdDataStartIndex = (unformattedValue) => {
    return unformattedValue.indexOf(Buffer.from([0x28, 0xb5, 0x2f, 0xfd]));
};

FranchiseZstdTable3FieldStrategy.getInitialUnformattedValue = (
    field,
    data,
    overflowField,
    strategyContext
) => {
    // extend maxLength + 2 because the first 2 bytes are the size of the compressed data
    const table3InitialData = data.slice(
        field.thirdTableField.index,
        field.thirdTableField.index + field.offset.maxLength + 2
    );

    // If an overflow field exists, concatenate its data to get the full unformatted value
    if (overflowField) {
        const overflowData = data.slice(
            overflowField.thirdTableField.index,
            overflowField.thirdTableField.index +
                overflowField.offset.maxLength +
                2
        );
        return Buffer.concat([table3InitialData, overflowData]);
    }

    // Otherwise, just return the initial data
    return table3InitialData;
};

FranchiseZstdTable3FieldStrategy.getFormattedValueFromUnformatted = (
    unformattedValue,
    strategyContext
) => {
    const gameYear = getGameYear(strategyContext);
    const gameType = getGameType(strategyContext);
    const dictionary = getDictionary(gameYear, gameType);
    const isonProcessor = getIsonProcessor(gameYear, gameType);
    // First two bytes are the size of the zipped data, so skip those and get the raw ISON buffer
    const zstdDataStartIndex =
        FranchiseZstdTable3FieldStrategy.getZstdDataStartIndex(
            unformattedValue
        );
    // Zstd decoder cannot handle extra padding bytes, so we need to get the exact number of bytes
    const length = unformattedValue.readUInt16LE(0);

    const isonBuf = zlib.zstdDecompressSync(
        unformattedValue.subarray(
            zstdDataStartIndex,
            zstdDataStartIndex + length
        ),
        { dictionary: dictionary }
    );

    // Convert the ISON buffer to a JSON object using the class instance
    const jsonObj = isonProcessor.isonVisualsToJson(isonBuf);
    return JSON.stringify(jsonObj);
};

FranchiseZstdTable3FieldStrategy.setUnformattedValueFromFormatted = (
    formattedValue,
    oldUnformattedValue,
    maxLength,
    strategyContext
) => {
    const gameYear = getGameYear(strategyContext);
    const gameType = getGameType(strategyContext);
    const dictionary = getDictionary(gameYear, gameType);
    const isonProcessor = getIsonProcessor(gameYear, gameType);
    // Parse the JSON string into a JSON object
    let jsonObj = JSON.parse(formattedValue);
    // Convert the object into an ISON buffer using the class instance
    let isonBuf = isonProcessor.jsonVisualsToIson(jsonObj);

    // Create the zstd-compressed buffer
    let compressedBuf = zlib.zstdCompressSync(isonBuf, {
        dictionary: dictionary
    });

    // Some larger formatted values may require a higher compression level to fit within the field
    // We use this check instead of always using the higher compression level for performance reasons
    if (compressedBuf.length > maxLength) {
        compressedBuf = zlib.zstdCompressSync(isonBuf, {
            dictionary: dictionary,
            params: { [zlib.constants.ZSTD_c_compressionLevel]: 19 }
        });

        // If it still doesn't fit, return just the size + buffer so it can be handled via overflow record
        if (compressedBuf.length > maxLength) {
            const sizeBuf = Buffer.alloc(2);
            sizeBuf.writeUInt16LE(compressedBuf.length);
            return Buffer.concat([sizeBuf, compressedBuf]);
        }
    }

    let padding = Buffer.alloc(maxLength - compressedBuf.length); // table3s all have the same length and are zero padded to the end.
    let sizeBuf = Buffer.alloc(2);
    sizeBuf.writeUInt16LE(compressedBuf.length);
    return Buffer.concat([sizeBuf, compressedBuf, padding]);
};

export default FranchiseZstdTable3FieldStrategy;
