import FranchiseTable2FieldStrategy from '../../common/table2Field/FranchiseTable2FieldStrategy.js';
/**
 * @type {Table2FieldStrategy}
 */
let M20Table2Strategy = {};
M20Table2Strategy.getInitialUnformattedValue =
    FranchiseTable2FieldStrategy.getInitialUnformattedValue;
M20Table2Strategy.setUnformattedValueFromFormatted =
    FranchiseTable2FieldStrategy.setUnformattedValueFromFormatted;
export default M20Table2Strategy;
