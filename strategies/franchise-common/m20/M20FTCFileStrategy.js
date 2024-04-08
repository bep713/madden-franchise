const FTCFileStrategy = require('../../common/file/FTCFileStrategy');

/**
 * @type {FileStrategy}
 */
let M20FTCFileStrategy = {};

M20FTCFileStrategy.postPackFile = FTCFileStrategy.postPackFile;
M20FTCFileStrategy.generateUnpackedContents = FTCFileStrategy.generateUnpackedContents;

module.exports = M20FTCFileStrategy;