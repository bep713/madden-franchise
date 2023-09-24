const FranchiseTable3FieldStrategy = require('../../common/table3Field/FranchiseTable3FieldStrategy');

let M24Table3Strategy = {};

M24Table3Strategy.getInitialUnformattedValue = FranchiseTable3FieldStrategy.getInitialUnformattedValue;
M24Table3Strategy.getFormattedValueFromUnformatted = FranchiseTable3FieldStrategy.getFormattedValueFromUnformatted;
M24Table3Strategy.setUnformattedValueFromFormatted = FranchiseTable3FieldStrategy.setUnformattedValueFromFormatted;

module.exports = M24Table3Strategy;