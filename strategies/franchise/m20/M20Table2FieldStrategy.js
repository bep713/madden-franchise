const FranchiseTable2FieldStrategy = require('../../common/table2Field/FranchiseTable2FieldStrategy');

let M20Table2Strategy = {};

M20Table2Strategy.getInitialUnformattedValue = FranchiseTable2FieldStrategy.getInitialUnformattedValue;
M20Table2Strategy.setUnformattedValueFromFormatted = FranchiseTable2FieldStrategy.setUnformattedValueFromFormatted;

module.exports = M20Table2Strategy;