const M20TableHeaderStrategy = require('../../common/header/m20/M20TableHeaderStrategy');
const M24TableHeaderStrategy = require('../../common/header/m24/M24TableHeaderStrategy');
const FTCTableStrategy = require('../../common/table/FTCTableStrategy');

let M20FTCTableStrategy = {};

M20FTCTableStrategy.parseHeader = M24TableHeaderStrategy.parseHeader;
M20FTCTableStrategy.parseHeaderAttributesFromSchema = M20TableHeaderStrategy.parseHeaderAttributesFromSchema;

M20FTCTableStrategy.getTable2BinaryData = FTCTableStrategy.getTable2BinaryData;
M20FTCTableStrategy.getTable3BinaryData = FTCTableStrategy.getTable2BinaryData;
M20FTCTableStrategy.getMandatoryOffsets = FTCTableStrategy.getMandatoryOffsets;
M20FTCTableStrategy.recalculateStringOffsets = () => {};

module.exports = M20FTCTableStrategy;