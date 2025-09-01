import FranchiseTableStrategy from "../../common/table/FranchiseTableStrategy.js";
import M20TableHeaderStrategy from "../../common/header/m20/M20TableHeaderStrategy.js";
import M24TableHeaderStrategy from "../../common/header/m24/M24TableHeaderStrategy.js";
/**
 * @type {TableStrategy}
 */
let M24TableStrategy = {};
M24TableStrategy.parseHeader = M24TableHeaderStrategy.parseHeader;
M24TableStrategy.parseHeaderAttributesFromSchema = M20TableHeaderStrategy.parseHeaderAttributesFromSchema;
M24TableStrategy.getTable2BinaryData = FranchiseTableStrategy.getTable2BinaryData;
M24TableStrategy.getTable3BinaryData = FranchiseTableStrategy.getTable2BinaryData;
M24TableStrategy.getMandatoryOffsets = FranchiseTableStrategy.getMandatoryOffsets;
M24TableStrategy.recalculateStringOffsets = FranchiseTableStrategy.recalculateStringOffsets;
M24TableStrategy.recalculateBlobOffsets = FranchiseTableStrategy.recalculateBlobOffsets;
export default M24TableStrategy;
