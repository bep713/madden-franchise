import FTCFileStrategy from '../../common/file/FTCFileStrategy.js';
/**
 * @type {FileStrategy}
 */
let M20FTCFileStrategy = {};
M20FTCFileStrategy.postPackFile = FTCFileStrategy.postPackFile;
M20FTCFileStrategy.generateUnpackedContents =
    FTCFileStrategy.generateUnpackedContents;
export default M20FTCFileStrategy;
