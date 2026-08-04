import FranchiseTableStrategy from './FranchiseTableStrategy.js';

let FTCTableStrategy = {};
FTCTableStrategy.getTable2BinaryData = (
    table2Records,
    fullTable2Buffer,
    isCompact
) =>
    FranchiseTableStrategy.getTable2BinaryData(
        table2Records,
        fullTable2Buffer,
        isCompact
    );
FTCTableStrategy.getMandatoryOffsets = (offsets) => {
    return offsets
        .filter((offset) => {
            return offset.valueInSecondTable;
        })
        .map((offset) => {
            return offset.name;
        });
};
FTCTableStrategy.recalculateStringOffsets = (table, record) =>
    FranchiseTableStrategy.recalculateStringOffsets(table, record);
FTCTableStrategy.recalculateBlobOffsets = (table, record) =>
    FranchiseTableStrategy.recalculateBlobOffsets(table, record);
export default FTCTableStrategy;
