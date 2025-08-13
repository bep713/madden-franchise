import CommonAlgorithms from "../CommonAlgorithms.js";
let FTCTableStrategy = {};
FTCTableStrategy.getTable2BinaryData = (table2Records, fullTable2Buffer) => {
    return [CommonAlgorithms.save(table2Records, fullTable2Buffer)];
};
FTCTableStrategy.getMandatoryOffsets = (offsets) => {
    return offsets.filter((offset) => {
        return offset.valueInSecondTable;
    }).map((offset) => {
        return offset.name;
    });
};
export default FTCTableStrategy;
