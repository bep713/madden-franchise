const FranchiseTableStrategy = require('../../common/table/FranchiseTableStrategy');
const M20TableHeaderStrategy = require('../../common/header/m20/M20TableHeaderStrategy');

/**
 * @type {TableStrategy}
 */
let M20TableStrategy = {};

M20TableStrategy.parseHeader = M20TableHeaderStrategy.parseHeader;
M20TableStrategy.parseHeaderAttributesFromSchema = M20TableHeaderStrategy.parseHeaderAttributesFromSchema;

M20TableStrategy.getTable2BinaryData = FranchiseTableStrategy.getTable2BinaryData;
M20TableStrategy.getTable3BinaryData = FranchiseTableStrategy.getTable2BinaryData;
M20TableStrategy.getMandatoryOffsets = FranchiseTableStrategy.getMandatoryOffsets;
M20TableStrategy.recalculateStringOffsets = FranchiseTableStrategy.recalculateStringOffsets;
M20TableStrategy.recalculateBlobOffsets = FranchiseTableStrategy.recalculateBlobOffsets;

module.exports = M20TableStrategy;