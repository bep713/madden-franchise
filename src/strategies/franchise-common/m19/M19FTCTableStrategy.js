import M19TableHeaderStrategy from '../../common/header/m19/M19TableHeaderStrategy.js';
import FTCTableStrategy from '../../common/table/FTCTableStrategy.js';
/**
 * @type {TableStrategy}
 */
let M19FTCTableStrategy = {};
M19FTCTableStrategy.parseHeader = M19TableHeaderStrategy.parseHeader;
M19FTCTableStrategy.parseHeaderAttributesFromSchema =
    M19TableHeaderStrategy.parseHeaderAttributesFromSchema;
M19FTCTableStrategy.getTable2BinaryData = FTCTableStrategy.getTable2BinaryData;
M19FTCTableStrategy.getTable3BinaryData = FTCTableStrategy.getTable2BinaryData;
M19FTCTableStrategy.getMandatoryOffsets = FTCTableStrategy.getMandatoryOffsets;
M19FTCTableStrategy.recalculateStringOffsets = () => {};
export default M19FTCTableStrategy;
