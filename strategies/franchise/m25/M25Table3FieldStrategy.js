const FranchiseTable3FieldStrategy = require('../../common/table3Field/FranchiseIsonTable3FieldStrategy');

/**
 * @type {Table3FieldStrategy}
 */
let M25Table3Strategy = {};

M25Table3Strategy.getInitialUnformattedValue = FranchiseTable3FieldStrategy.getInitialUnformattedValue;
M25Table3Strategy.getFormattedValueFromUnformatted = FranchiseTable3FieldStrategy.getFormattedValueFromUnformatted;
M25Table3Strategy.setUnformattedValueFromFormatted = FranchiseTable3FieldStrategy.setUnformattedValueFromFormatted;

module.exports = M25Table3Strategy;