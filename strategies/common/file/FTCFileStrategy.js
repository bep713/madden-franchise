import CommonFileStrategy from './CommonFileStrategy.js';
let FTCFileStrategy = {};
FTCFileStrategy.generateUnpackedContents = CommonFileStrategy.generateUnpackedContents;
FTCFileStrategy.postPackFile = (originalData, newData) => {
    return newData;
};
export default FTCFileStrategy;
