export default FranchiseTableStrategy;
declare namespace FranchiseTableStrategy {
    function getTable2BinaryData(table2Records: any, fullTable2Buffer: any): any[];
    function getMandatoryOffsets(): never[];
    function recalculateStringOffsets(table: any, record: any): void;
    function recalculateBlobOffsets(table: any, record: any): void;
}
//# sourceMappingURL=FranchiseTableStrategy.d.ts.map