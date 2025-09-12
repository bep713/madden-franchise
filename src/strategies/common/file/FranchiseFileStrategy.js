import CommonFileStrategy from './CommonFileStrategy.js';
const COMPRESSED_DATA_OFFSET = 0x52;
let FranchiseFileStrategy = {};
FranchiseFileStrategy.generateUnpackedContents =
    CommonFileStrategy.generateUnpackedContents;
FranchiseFileStrategy.postPackFile = (originalData, newData) => {
    const header = originalData.slice(0, COMPRESSED_DATA_OFFSET);
    const endOfData = newData.length.toString(16);
    header[0x4a] = parseInt(endOfData.substr(4), 16);
    header[0x4b] = parseInt(endOfData.substr(2, 2), 16);
    header[0x4c] = parseInt(endOfData.substr(0, 2), 16);
    const trailer = originalData.slice(newData.length + COMPRESSED_DATA_OFFSET);
    return Buffer.concat([header, newData, trailer]);
};
export default FranchiseFileStrategy;
