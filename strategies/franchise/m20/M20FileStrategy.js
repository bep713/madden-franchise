const FranchiseFileStrategy = require('../../common/file/FranchiseFileStrategy');

/**
 * @type {FileStrategy}
 */
let M20FileStrategy = {};

M20FileStrategy.postPackFile = FranchiseFileStrategy.postPackFile;
M20FileStrategy.generateUnpackedContents = FranchiseFileStrategy.generateUnpackedContents;

module.exports = M20FileStrategy;