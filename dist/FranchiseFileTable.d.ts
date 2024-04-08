export = FranchiseFileTable;
/**
 * @typedef {Object} FranchiseFileTableHeader
 * @param {string} name
 * @param {boolean} isArray
 * @param {number} tableId
 * @param {number} tablePad1
 * @param {number} uniqueId
 * @param {number} tableUnknown1
 * @param {number} tableUnknown2
 * @param {string} data1Id
 * @param {number} data1Type
 * @param {number} data1Unknown1
 * @param {number} data1Flag1
 * @param {number} data1Flag2
 * @param {number} data1Flag3
 * @param {number} data1Flag4
 * @param {number} tableStoreLength
 * @param {string} tableStoreName
 * @param {number} data1Offset
 * @param {string} data1TableId
 * @param {number} data1RecordCount
 * @param {number} data1Pad2
 * @param {number} table1Length
 * @param {number} table2Length
 * @param {number} data1Pad3
 * @param {number} data1Pad4
 * @param {number} headerSize
 * @param {number} headerOffset
 * @param {number} record1SizeOffset
 * @param {number} record1SizeLength
 * @param {number} record1Size
 * @param {number} offsetStart
 * @param {string} data2Id
 * @param {number} table1Length2
 * @param {number} tableTotalLength
 * @param {boolean} hasSecondTable
 * @param {number} table1StartIndex
 * @param {number} table2StartIndex
 * @param {number} recordWords
 * @param {number} recordCapacity
 * @param {number} numMembers
 * @param {number} nextRecordToUse
 * @param {boolean} hasThirdTable
 */
/**
 * @typedef {Object} OffsetTableEntry
 * @param {number} index
 * @param {number} originalIndex
 * @param {string} name
 * @param {string} type
 * @param {boolean} isReference
 * @param {boolean} valueInSecondTable
 * @param {boolean} valueInThirdTable
 * @param {boolean} isSigned
 * @param {number} minValue
 * @param {number} maxValue
 * @param {number} maxLength
 * @param {boolean} final
 * @param {number} indexOffset
 * @param {FranchiseEnum} enum
 * @param {boolean} const
 * @param {number} offset
 */
/**
 * @typedef EmptyRecordEntry
 * @param {number} previous
 * @param {number} next
 */
declare class FranchiseFileTable {
    constructor(data: any, offset: any, gameYear: any, strategy: any, settings: any);
    index: number;
    /** @type {Buffer} */
    data: Buffer;
    /** @type {number} */
    lengthAtLastSave: number;
    /** @type {number} */
    offset: number;
    /** @type {GameStrategy} */
    strategyBase: GameStrategy;
    /** @type {TableStrategy} */
    strategy: TableStrategy;
    recordsRead: boolean;
    /** @type {number} */
    _gameYear: number;
    /** @type {FranchiseFileTableHeader} */
    header: FranchiseFileTableHeader;
    /** @type {string} */
    name: string;
    /** @type {boolean} */
    isArray: boolean;
    /** @type {Array<OffsetTableEntry>} */
    loadedOffsets: Array<OffsetTableEntry>;
    isChanged: boolean;
    /** @type {Array<FranchiseFileRecord>} */
    records: Array<FranchiseFileRecord>;
    /** @type {Array<FranchiseFileTable2Field>} */
    table2Records: Array<FranchiseFileTable2Field>;
    /** @type {Array<FranchiseFileTable3Field>} */
    table3Records: Array<FranchiseFileTable3Field>;
    /** @type {Array<number>} */
    arraySizes: Array<number>;
    /** @type {Map<EmptyRecordEntry>} */
    emptyRecords: Map<any>;
    /** @type {FranchiseFileSettings} */
    _settings: FranchiseFileSettings;
    /** @returns {Buffer} */
    get hexData(): Buffer;
    /** @param {TableSchema} schema */
    set schema(schema: TableSchema);
    /** @type {TableSchema} */
    get schema(): TableSchema;
    /** @private @type {TableSchema} */
    private _schema;
    offsetTable: any[] | {
        final: boolean;
        index: number;
        indexOffset: number;
        isSigned: boolean;
        length: number;
        maxLength: any;
        maxValue: any;
        minValue: any;
        name: string;
        offset: number;
        type: string;
        valueInSecondTable: boolean;
        valueInThirdTable: boolean;
    }[];
    _generateGenericSchema(): {
        attributes: {
            name: string;
            type: string;
            minValue: number;
            maxValue: number;
        }[];
    };
    /** @param {number} index @returns {string} */
    getBinaryReferenceToRecord(index: number): string;
    updateBuffer(): void;
    /** @param {number} index @param {boolean} resetEmptyRecordMap */
    setNextRecordToUse(index: number, resetEmptyRecordMap: boolean): void;
    /** @param {number} index */
    _setNextRecordToUseBuffer(index: number): void;
    recalculateEmptyRecordReferences(): void;
    /** @param {Buffer} buf @param {boolean} shouldReadRecords @returns {Promise<FranchiseFileTable>?} */
    replaceRawData(buf: Buffer, shouldReadRecords: boolean): Promise<FranchiseFileTable> | null;
    /** @param {Array<string>?} [attribsToLoad] @returns {Promise<FranchiseFileTable>} */
    readRecords(attribsToLoad?: Array<string> | null): Promise<FranchiseFileTable>;
    /** @returns {Map<EmptyRecordEntry>} */
    _parseEmptyRecords(): Map<any>;
    /** @param {FranchiseFileRecord} */
    _onRecordEmpty(record: any): void;
    /** @param {Buffer} data @param {FranchiseFileTableHeader} header @param {Array<FranchiseFileRecord>} records */
    _parseTable2Values(data: Buffer, header: FranchiseFileTableHeader, records: Array<FranchiseFileRecord>): void;
    /** @param {Buffer} data @param {FranchiseFileTableHeader} header @param {Array<FranchiseFileRecord>} records */
    _parseTable3Values(data: Buffer, header: FranchiseFileTableHeader, records: Array<FranchiseFileRecord>): void;
    /** @param {number} index @param {number} emptyRecordReference */
    _changeRecordBuffers(index: number, emptyRecordReference: number): void;
    /** @param {number} index @param {number} emptyRecordReference */
    _setBufferToEmptyRecordReference(index: number, emptyRecordReference: number): void;
    /** @param {number} index @param {number} emptyRecordReference */
    _setRecordInternalBuffer(index: number, emptyRecordReference: number): void;
    /** @param {string} name @param {*} object */
    onEvent(name: string, object: any): void;
}
declare namespace FranchiseFileTable {
    export { FranchiseFileTableHeader, OffsetTableEntry, EmptyRecordEntry };
}
type FranchiseFileTableHeader = any;
type OffsetTableEntry = any;
import FranchiseFileRecord = require("./FranchiseFileRecord");
import FranchiseFileTable2Field = require("./FranchiseFileTable2Field");
import FranchiseFileTable3Field = require("./FranchiseFileTable3Field");
import FranchiseFileSettings = require("./FranchiseFileSettings");
type EmptyRecordEntry = any;
//# sourceMappingURL=FranchiseFileTable.d.ts.map