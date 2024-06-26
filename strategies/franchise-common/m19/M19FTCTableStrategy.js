const M19TableHeaderStrategy = require('../../common/header/m19/M19TableHeaderStrategy');
const FTCTableStrategy = require('../../common/table/FTCTableStrategy');

/**
 * @type {TableStrategy}
 */
let M19FTCTableStrategy = {};

M19FTCTableStrategy.parseHeader = M19TableHeaderStrategy.parseHeader;
M19FTCTableStrategy.parseHeaderAttributesFromSchema = M19TableHeaderStrategy.parseHeaderAttributesFromSchema;

M19FTCTableStrategy.getTable2BinaryData = FTCTableStrategy.getTable2BinaryData;
M19FTCTableStrategy.getTable3BinaryData = FTCTableStrategy.getTable2BinaryData;
M19FTCTableStrategy.getMandatoryOffsets = FTCTableStrategy.getMandatoryOffsets;
M19FTCTableStrategy.recalculateStringOffsets = () => {};

module.exports = M19FTCTableStrategy;