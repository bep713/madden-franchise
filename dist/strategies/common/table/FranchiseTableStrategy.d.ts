export default FranchiseTableStrategy;
declare namespace FranchiseTableStrategy {
    function getTable2BinaryData(table2Records: any, fullTable2Buffer: any): any[];
    function getMandatoryOffsets(offsets: any): never[];
    function recalculateStringOffsets(table: any, record: any): void;
    function recalculateBlobOffsets(table: any, record: any): void;
}
//# sourceMappingURL=FranchiseTableStrategy.d.ts.map