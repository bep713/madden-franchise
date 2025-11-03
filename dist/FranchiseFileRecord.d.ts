export default FranchiseFileRecord;
export type OffsetTableEntry = import('./FranchiseFileTable.js').OffsetTableEntry;
export type FranchiseFileTable = import('./FranchiseFileTable.js').default;
export type RecordReference = import('./FranchiseFile.js').RecordReference;
/**
 * @typedef {import('./FranchiseFileTable.js').OffsetTableEntry} OffsetTableEntry
 * @typedef {import('./FranchiseFileTable.js').default} FranchiseFileTable
 * @typedef {import('./FranchiseFile.js').RecordReference} RecordReference
 */
declare class FranchiseFileRecord {
    /** @param {Buffer} data @param {number} index @param {OffsetTableEntry} offsetTable, @param {FranchiseFileTable} parent */
    constructor(data: Buffer, index: number, offsetTable: OffsetTableEntry, parent: FranchiseFileTable);
    /** @type {Buffer}  */
    _data: Buffer;
    /** @type {OffsetTableEntry} */
    _offsetTable: OffsetTableEntry;
    /** @type {number} */
    index: number;
    /** @private @type {Array<FranchiseFileField>} */
    private _fieldsArray;
    /** @private @type {Record<string, FranchiseFileField>} */
    private _fields;
    _isChanged: boolean;
    /** @type {number} */
    arraySize: number;
    isEmpty: boolean;
    /** @type {FranchiseFileTable} */
    _parent: FranchiseFileTable;
    /** @returns {Buffer} */
    get hexData(): Buffer;
    /** @returns {Record<string, FranchiseFileField>} */
    get fields(): Record<string, FranchiseFileField>;
    /** @returns {Array<FranchiseFileField>} */
    get fieldsArray(): FranchiseFileField[];
    /** @param {Buffer} data */
    set data(data: Buffer);
    /** @returns {Buffer} */
    get data(): Buffer;
    /** @param {boolean} changed */
    set isChanged(changed: boolean);
    get isChanged(): boolean;
    /** @returns {FranchiseFileTable} */
    get parent(): import("./FranchiseFileTable.js").default;
    /** @param {string} key @returns {FranchiseFileField?} */
    getFieldByKey(key: string): FranchiseFileField | null;
    /** @param {string} key @returns {*?} */
    getValueByKey(key: string): any | null;
    /** @param {string} key @returns {RecordReference?} */
    getReferenceDataByKey(key: string): RecordReference | null;
    /** @returns {Record<string, FranchiseFileField>} */
    parseRecordFields(): Record<string, FranchiseFileField>;
    empty(): void;
    /** @param {string} name @param {FranchiseFileField} field */
    onEvent(name: string, field: FranchiseFileField): void;
}
import FranchiseFileField from './FranchiseFileField.js';
//# sourceMappingURL=FranchiseFileRecord.d.ts.map