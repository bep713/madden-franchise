const FranchiseTable2FieldStrategy = require('../../common/table2Field/FranchiseTable2FieldStrategy');

/**
 * @type {Table2FieldStrategy}
 */
let M19Table2Strategy = {};

M19Table2Strategy.getInitialUnformattedValue = FranchiseTable2FieldStrategy.getInitialUnformattedValue;
M19Table2Strategy.setUnformattedValueFromFormatted = FranchiseTable2FieldStrategy.setUnformattedValueFromFormatted;

module.exports = M19Table2Strategy;