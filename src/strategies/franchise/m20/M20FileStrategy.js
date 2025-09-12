import FranchiseFileStrategy from '../../common/file/FranchiseFileStrategy.js';
/**
 * @type {FileStrategy}
 */
let M20FileStrategy = {};
M20FileStrategy.postPackFile = FranchiseFileStrategy.postPackFile;
M20FileStrategy.generateUnpackedContents =
    FranchiseFileStrategy.generateUnpackedContents;
export default M20FileStrategy;
