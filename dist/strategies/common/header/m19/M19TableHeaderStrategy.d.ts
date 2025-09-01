export default M19TableHeaderStrategy;
declare namespace M19TableHeaderStrategy {
    function parseHeader(data: any): {
        name: string;
        isArray: boolean;
        tableId: any;
        tablePad1: any;
        uniqueId: any;
        tableUnknown1: any;
        tableUnknown2: any;
        data1Id: string;
        data1Type: any;
        data1Unknown1: any;
        data1Flag1: any;
        data1Flag2: any;
        data1Flag3: any;
        data1Flag4: any;
        tableStoreLength: any;
        tableStoreName: string | null;
        data1Offset: any;
        data1TableId: any;
        data1RecordCount: any;
        data1Pad2: any;
        table1Length: any;
        table2Length: any;
        data1Pad3: any;
        data1Pad4: any;
        headerSize: number;
        headerOffset: number;
        record1SizeOffset: number;
        record1SizeLength: number;
        record1Size: number;
        offsetStart: any;
        data2Id: string;
        table1Length2: any;
        tableTotalLength: any;
        hasSecondTable: boolean;
        table1StartIndex: number;
        table2StartIndex: number;
        recordWords: any;
        recordCapacity: any;
        numMembers: any;
        nextRecordToUse: any;
        hasThirdTable: boolean;
    };
    function parseHeaderAttributesFromSchema(schema: any, data: any, header: any): {
        headerSize: any;
        record1Size: any;
        table1StartIndex: any;
        table2StartIndex: any;
    };
}
//# sourceMappingURL=M19TableHeaderStrategy.d.ts.map