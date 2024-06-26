const FranchiseTableStrategy = require('../../common/table/FranchiseTableStrategy');
const M19TableHeaderStrategy = require('../../common/header/m19/M19TableHeaderStrategy');

/**
 * @type {TableStrategy}
 */
let M19TableStrategy = {};

M19TableStrategy.parseHeader = M19TableHeaderStrategy.parseHeader;
M19TableStrategy.parseHeaderAttributesFromSchema = M19TableHeaderStrategy.parseHeaderAttributesFromSchema;

M19TableStrategy.getTable2BinaryData = FranchiseTableStrategy.getTable2BinaryData;
M19TableStrategy.getTable3BinaryData = FranchiseTableStrategy.getTable2BinaryData;
M19TableStrategy.getMandatoryOffsets = FranchiseTableStrategy.getMandatoryOffsets;
M19TableStrategy.recalculateStringOffsets = FranchiseTableStrategy.recalculateStringOffsets;
M19TableStrategy.recalculateBlobOffsets = FranchiseTableStrategy.recalculateBlobOffsets;

module.exports = M19TableStrategy;