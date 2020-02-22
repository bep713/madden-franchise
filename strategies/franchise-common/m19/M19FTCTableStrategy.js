const M19TableHeaderStrategy = require('../../common/header/m19/M19TableHeaderStrategy');
const FTCTableStrategy = require('../../common/table/FTCTableStrategy');

let M19FTCTableStrategy = {};

M19FTCTableStrategy.parseHeader = M19TableHeaderStrategy.parseHeader;
M19FTCTableStrategy.parseHeaderAttributesFromSchema = M19TableHeaderStrategy.parseHeaderAttributesFromSchema;

M19FTCTableStrategy.getTable2BinaryData = FTCTableStrategy.getTable2BinaryData;
M19FTCTableStrategy.getMandatoryOffsets = FTCTableStrategy.getMandatoryOffsets;

module.exports = M19FTCTableStrategy;