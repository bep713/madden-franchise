/// <reference types="node" />
export default FranchiseFileTable;
export type FranchiseFileTableHeader = {
    name: string;
    isArray: boolean;
    tableId: number;
    tablePad1: number;
    uniqueId: number;
    tableUnknown1: number;
    tableUnknown2: number;
    data1Id: string;
    data1Type: number;
    data1Unknown1: number;
    data1Flag1: number;
    data1Flag2: number;
    data1Flag3: number;
    data1Flag4: number;
    tableStoreLength: number;
    tableStoreName: string;
    data1Offset: number;
    data1TableId: string;
    data1RecordCount: number;
    data1Pad2: number;
    table1Length: number;
    table2Length: number;
    data1Pad3: number;
    data1Pad4: number;
    headerSize: number;
    headerOffset: number;
    record1SizeOffset: number;
    record1SizeLength: number;
    record1Size: number;
    offsetStart: number;
    data2Id: string;
    table1Length2: number;
    tableTotalLength: number;
    hasSecondTable: boolean;
    table1StartIndex: number;
    table2StartIndex: number;
    recordWords: number;
    recordCapacity: number;
    numMembers: number;
    nextRecordToUse: number;
    hasThirdTable: boolean;
};
export type OffsetTableEntry = {
    index: number;
    originalIndex: number;
    name: string;
    type: string;
    isReference: boolean;
    valueInSecondTable: boolean;
    valueInThirdTable: boolean;
    isSigned: boolean;
    minValue: number;
    maxValue: number;
    maxLength: number;
    final: boolean;
    indexOffset: number;
    enum: FranchiseEnum;
    const: boolean;
    offset: number;
};
export type EmptyRecordEntry = {
    previous: number;
    next: number;
};
export type FranchiseFileSettings = import('./FranchiseFileSettings.js').default;
export type TableSchema = import('./FranchiseSchema.js').TableSchema;
export type FranchiseEnum = import('./FranchiseEnum.js').default;
export type GameStrategy = import('./strategies/StrategyPicker.js').GameStrategy;
export type TableStrategy = import('./strategies/StrategyPicker.js').TableStrategy;
/**
 * @typedef {Object} FranchiseFileTableHeader
 * @property {string} name
 * @property {boolean} isArray
 * @property {number} tableId
 * @property {number} tablePad1
 * @property {number} uniqueId
 * @property {number} tableUnknown1
 * @property {number} tableUnknown2
 * @property {string} data1Id
 * @property {number} data1Type
 * @property {number} data1Unknown1
 * @property {number} data1Flag1
 * @property {number} data1Flag2
 * @property {number} data1Flag3
 * @property {number} data1Flag4
 * @property {number} tableStoreLength
 * @property {string} tableStoreName
 * @property {number} data1Offset
 * @property {string} data1TableId
 * @property {number} data1RecordCount
 * @property {number} data1Pad2
 * @property {number} table1Length
 * @property {number} table2Length
 * @property {number} data1Pad3
 * @property {number} data1Pad4
 * @property {number} headerSize
 * @property {number} headerOffset
 * @property {number} record1SizeOffset
 * @property {number} record1SizeLength
 * @property {number} record1Size
 * @property {number} offsetStart
 * @property {string} data2Id
 * @property {number} table1Length2
 * @property {number} tableTotalLength
 * @property {boolean} hasSecondTable
 * @property {number} table1StartIndex
 * @property {number} table2StartIndex
 * @property {number} recordWords
 * @property {number} recordCapacity
 * @property {number} numMembers
 * @property {number} nextRecordToUse
 * @property {boolean} hasThirdTable
 */
/**
 * @typedef {Object} OffsetTableEntry
 * @property {number} index
 * @property {number} originalIndex
 * @property {string} name
 * @property {string} type
 * @property {boolean} isReference
 * @property {boolean} valueInSecondTable
 * @property {boolean} valueInThirdTable
 * @property {boolean} isSigned
 * @property {number} minValue
 * @property {number} maxValue
 * @property {number} maxLength
 * @property {boolean} final
 * @property {number} indexOffset
 * @property {FranchiseEnum} enum
 * @property {boolean} const
 * @property {number} offset
 */
/**
 * @typedef EmptyRecordEntry
 * @property {number} previous
 * @property {number} next
 */
/**
 * @typedef {import('./FranchiseFileSettings.js').default} FranchiseFileSettings
 * @typedef {import('./FranchiseSchema.js').TableSchema} TableSchema
 * @typedef {import('./FranchiseEnum.js').default} FranchiseEnum
 * @typedef {import('./strategies/StrategyPicker.js').GameStrategy} GameStrategy
 * @typedef {import('./strategies/StrategyPicker.js').TableStrategy} TableStrategy
 */
declare class FranchiseFileTable extends events {
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
    emptyRecords: Map<EmptyRecordEntry, any>;
    /** @type {FranchiseFileSettings} */
    _settings: FranchiseFileSettings;
    /** @returns {Buffer} */
    get hexData(): Buffer;
    /** @param {TableSchema} schema */
    set schema(schema: import("./FranchiseSchema.js").TableSchema);
    /** @type {TableSchema} */
    get schema(): import("./FranchiseSchema.js").TableSchema;
    /** @private @type {TableSchema} */
    private _schema;
    offsetTable: any[] | {
        final: boolean;
        index: number;
        indexOffset: number;
        isSigned: boolean;
        length: number;
        maxLength: null;
        maxValue: null;
        minValue: null;
        name: string;
        offset: number;
        type: string;
        valueInSecondTable: boolean;
        valueInThirdTable: boolean;
    }[] | undefined;
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
    readRecords(attribsToLoad?: string[] | null | undefined): Promise<FranchiseFileTable>;
    /** @returns {Map<EmptyRecordEntry>} */
    _parseEmptyRecords(): Map<EmptyRecordEntry, any>;
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
import events from 'events';
import FranchiseFileRecord from './FranchiseFileRecord.js';
import FranchiseFileTable2Field from './FranchiseFileTable2Field.js';
import FranchiseFileTable3Field from './FranchiseFileTable3Field.js';
//# sourceMappingURL=FranchiseFileTable.d.ts.map