const FranchiseFileStrategy = require('../../common/file/FranchiseFileStrategy');

/**
 * @type {FileStrategy}
 */
let M19FileStrategy = {};

M19FileStrategy.postPackFile = FranchiseFileStrategy.postPackFile;
M19FileStrategy.generateUnpackedContents = FranchiseFileStrategy.generateUnpackedContents;

module.exports = M19FileStrategy;