import FranchiseTable3FieldStrategy from '../../common/table3Field/FranchiseIsonTable3FieldStrategy.js';
/**
 * @type {Table3FieldStrategy}
 */
let M25Table3Strategy = {};
M25Table3Strategy.getInitialUnformattedValue =
    FranchiseTable3FieldStrategy.getInitialUnformattedValue;
M25Table3Strategy.getFormattedValueFromUnformatted =
    FranchiseTable3FieldStrategy.getFormattedValueFromUnformatted;
M25Table3Strategy.setUnformattedValueFromFormatted =
    FranchiseTable3FieldStrategy.setUnformattedValueFromFormatted;
export default M25Table3Strategy;
