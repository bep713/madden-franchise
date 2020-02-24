const CommonFileStrategy = require('./CommonFileStrategy');

let FTCFileStrategy = {};

FTCFileStrategy.generateUnpackedContents = CommonFileStrategy.generateUnpackedContents;

FTCFileStrategy.postPackFile = (originalData, newData) => {
    return newData;
};

module.exports = FTCFileStrategy;