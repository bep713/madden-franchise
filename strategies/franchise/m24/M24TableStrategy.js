const FranchiseTableStrategy = require('../../common/table/FranchiseTableStrategy');
const M20TableHeaderStrategy = require('../../common/header/m20/M20TableHeaderStrategy');
const M24TableHeaderStrategy = require('../../common/header/m24/M24TableHeaderStrategy');

let M24TableStrategy = {};

M24TableStrategy.parseHeader = M24TableHeaderStrategy.parseHeader;
M24TableStrategy.parseHeaderAttributesFromSchema = M20TableHeaderStrategy.parseHeaderAttributesFromSchema;

M24TableStrategy.getTable2BinaryData = FranchiseTableStrategy.getTable2BinaryData;
M24TableStrategy.getTable3BinaryData = FranchiseTableStrategy.getTable2BinaryData;
M24TableStrategy.getMandatoryOffsets = FranchiseTableStrategy.getMandatoryOffsets;
M24TableStrategy.recalculateStringOffsets = FranchiseTableStrategy.recalculateStringOffsets;
M24TableStrategy.recalculateBlobOffsets = FranchiseTableStrategy.recalculateBlobOffsets;

module.exports = M24TableStrategy;