const FranchiseTableStrategy = require('../../common/table/FranchiseTableStrategy');
const M19TableHeaderStrategy = require('../../common/header/m19/M19TableHeaderStrategy');

let M19TableStrategy = {};

M19TableStrategy.parseHeader = M19TableHeaderStrategy.parseHeader;
M19TableStrategy.parseHeaderAttributesFromSchema = M19TableHeaderStrategy.parseHeaderAttributesFromSchema;

M19TableStrategy.getTable2BinaryData = FranchiseTableStrategy.getTable2BinaryData;
M19TableStrategy.getMandatoryOffsets = FranchiseTableStrategy.getMandatoryOffsets;

module.exports = M19TableStrategy;