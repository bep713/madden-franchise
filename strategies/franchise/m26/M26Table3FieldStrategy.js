const FranchiseTable3FieldStrategy = require('../../common/table3Field/FranchiseZstdTable3FieldStrategy');

/**
 * @type {Table3FieldStrategy}
 */
let M26Table3Strategy = {};

M26Table3Strategy.getInitialUnformattedValue = FranchiseTable3FieldStrategy.getInitialUnformattedValue;
M26Table3Strategy.getFormattedValueFromUnformatted = FranchiseTable3FieldStrategy.getFormattedValueFromUnformatted;
M26Table3Strategy.setUnformattedValueFromFormatted = FranchiseTable3FieldStrategy.setUnformattedValueFromFormatted;

module.exports = M26Table3Strategy;