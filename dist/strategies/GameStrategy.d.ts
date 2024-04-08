export interface FileStrategy {
  postPackFile: (originalData: any, newData: any) => any;
  generateUnpackedContents: (units: any, oldData: any) => any;
}

export interface TableStrategy {
  parseHeader: (data: any) => {
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
    tableStoreName: string;
    data1Offset: any;
    data1TableId: any;
    data1RecordCount: any;
    data1Pad2: any;
    table1Length: any;
    table2Length: any;
    data1Pad3: any;
    data1Pad4: any;
    headerSize: any;
    headerOffset: number;
    record1SizeOffset: number;
    record1SizeLength: number;
    record1Size: number;
    offsetStart: any;
    data2Id: string;
    table1Length2: any;
    tableTotalLength: any;
    hasSecondTable: boolean;
    table1StartIndex: any;
    table2StartIndex: any;
    recordWords: any;
    recordCapacity: any;
    numMembers: any;
    nextRecordToUse: any;
    hasThirdTable: boolean;
  };
  parseHeaderAttributesFromSchema: (schema: any, data: any, header: any) => {
    headerSize: any;
    record1Size: any;
    table1StartIndex: any;
    table2StartIndex: any;
  };
  getTable2BinaryData: (table2Records: any, fullTable2Buffer: any) => any[];
  getTable3BinaryData: (table2Records: any, fullTable2Buffer: any) => any[];
  getMandatoryOffsets: (offsets: any) => any[];
  recalculateStringOffsets: (table: any, record: any) => void;
  recalculateBlobOffsets: (table: any, record: any) => void;
};

export interface Table2FieldStrategy {
  getInitialUnformattedValue: (field: any, data: any) => any;
  setUnformattedValueFromFormatted: (formattedValue: any, maxLength: any) => any;
};

export interface Table3FieldStrategy {
  getInitialUnformattedValue: (field: any, data: any) => any;
  getFormattedValueFromUnformatted: (unformattedValue: any) => any;
  setUnformattedValueFromFormatted: (formattedValue: any, oldUnformattedValue: any, maxLength: any) => any;
};

export default interface GameStrategy {
  name: string;
  file: FileStrategy;
  table: TableStrategy;
  table2Field: Table2FieldStrategy;
  table3Field: Table3FieldStrategy;
}
