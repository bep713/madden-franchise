const FTCFileStrategy = require('../../common/file/FTCFileStrategy');

let M19FTCFileStrategy = {};

M19FTCFileStrategy.postPackFile = FTCFileStrategy.postPackFile;
M19FTCFileStrategy.generateUnpackedContents = FTCFileStrategy.generateUnpackedContents;

module.exports = M19FTCFileStrategy;