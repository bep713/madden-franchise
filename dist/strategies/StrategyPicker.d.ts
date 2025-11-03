export default StrategyPicker;
export type FileStrategy = {
    postPackFile: (arg0: any, arg1: any) => any;
    generateUnpackedContents: (arg0: any, arg1: any) => any;
};
export type FranchiseFileTableHeader = import('../FranchiseFileTable.js').FranchiseFileTableHeader;
export type TableStrategy = {
    parseHeader: (arg0: any) => FranchiseFileTableHeader;
    parseHeaderAttributesFromSchema: (arg0: any, arg1: any, arg2: any) => {
        headerSize: any;
        record1Size: any;
        table1StartIndex: any;
        table2StartIndex: any;
    };
    getTable2BinaryData: (arg0: any, arg1: any) => any[];
    getTable3BinaryData: (arg0: any, arg1: any) => any[];
    getMandatoryOffsets: (arg0: any) => any[];
    recalculateStringOffsets: (arg0: any, arg1: any) => void;
    recalculateBlobOffsets: (arg0: any, arg1: any) => void;
};
export type Table2FieldStrategy = {
    getInitialUnformattedValue: (arg0: any, arg1: any) => any;
    setUnformattedValueFromFormatted: (arg0: any, arg1: any) => any;
};
export type Table3FieldStrategy = {
    getInitialUnformattedValue: (arg0: any, arg1: any) => any;
    getFormattedValueFromUnformatted: (arg0: any) => any;
    setUnformattedValueFromFormatted: (arg0: any, arg1: any, arg2: any) => any;
};
export type GameStrategy = {
    name: string;
    file: FileStrategy;
    table: TableStrategy;
    table2Field: Table2FieldStrategy;
    table3Field: Table3FieldStrategy;
};
declare namespace StrategyPicker {
    /**
     * @returns GameStrategy
     */
    function pick(type: any): {
        name: string;
        file: FileStrategy;
        table: TableStrategy;
        table2Field: Table2FieldStrategy;
        table3Field: Table3FieldStrategy;
    };
}
//# sourceMappingURL=StrategyPicker.d.ts.map