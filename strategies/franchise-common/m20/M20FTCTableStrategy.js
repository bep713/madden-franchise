const M20TableHeaderStrategy = require('../../common/header/m20/M20TableHeaderStrategy');
const FTCTableStrategy = require('../../common/table/FTCTableStrategy');

let M20FTCTableStrategy = {};

M20FTCTableStrategy.parseHeader = M20TableHeaderStrategy.parseHeader;
M20FTCTableStrategy.parseHeaderAttributesFromSchema = M20TableHeaderStrategy.parseHeaderAttributesFromSchema;

M20FTCTableStrategy.getTable2BinaryData = FTCTableStrategy.getTable2BinaryData;
M20FTCTableStrategy.getMandatoryOffsets = FTCTableStrategy.getMandatoryOffsets;

module.exports = M20FTCTableStrategy;