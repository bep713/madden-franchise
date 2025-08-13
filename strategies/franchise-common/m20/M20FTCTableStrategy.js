import M20TableHeaderStrategy from "../../common/header/m20/M20TableHeaderStrategy.js";
import M24TableHeaderStrategy from "../../common/header/m24/M24TableHeaderStrategy.js";
import FTCTableStrategy from "../../common/table/FTCTableStrategy.js";
/**
 * @type {TableStrategy}
 */
let M20FTCTableStrategy = {};
M20FTCTableStrategy.parseHeader = M24TableHeaderStrategy.parseHeader;
M20FTCTableStrategy.parseHeaderAttributesFromSchema = M20TableHeaderStrategy.parseHeaderAttributesFromSchema;
M20FTCTableStrategy.getTable2BinaryData = FTCTableStrategy.getTable2BinaryData;
M20FTCTableStrategy.getTable3BinaryData = FTCTableStrategy.getTable2BinaryData;
M20FTCTableStrategy.getMandatoryOffsets = FTCTableStrategy.getMandatoryOffsets;
M20FTCTableStrategy.recalculateStringOffsets = () => { };
export default M20FTCTableStrategy;
