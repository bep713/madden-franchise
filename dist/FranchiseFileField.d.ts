export default FranchiseFileField;
export type BitView = any;
export type OffsetTableEntry = import('./FranchiseFileTable.js').OffsetTableEntry;
export type FranchiseFileRecord = import('./FranchiseFileRecord.js').default;
export type FranchiseEnumValue = import('./FranchiseEnumValue.js').default;
/**
 * @typedef {import('bit-buffer').BitView} BitView
 * @typedef {import('./FranchiseFileTable.js').OffsetTableEntry} OffsetTableEntry
 * @typedef {import('./FranchiseFileRecord.js').default} FranchiseFileRecord
 * @typedef {import('./FranchiseEnumValue.js').default} FranchiseEnumValue
 */
declare class FranchiseFileField {
    /** @param {string} key @param {Buffer} value @param {OffsetTableEntry} offset @param {FranchiseFileRecord} parent */
    constructor(key: string, value: Buffer, offset: OffsetTableEntry, parent: FranchiseFileRecord);
    /** @private */
    private _key;
    /** @private */
    private _recordBuffer;
    /** @private */
    private _unformattedValue;
    /** @private */
    private _offset;
    /** @private */
    private _parent;
    /** @private */
    private _isChanged;
    /** @type {FranchiseFileTable2Field?} */
    secondTableField: FranchiseFileTable2Field | null;
    /** @type {FranchiseFileTable3Field?} */
    thirdTableField: FranchiseFileTable3Field | null;
    /** @returns {string} */
    get key(): string;
    /** @returns {OffsetTableEntry} */
    get offset(): import("./FranchiseFileTable.js").OffsetTableEntry;
    set value(value: any);
    /** @returns {*} */
    get value(): any;
    _value: any;
    /** @returns {boolean} */
    get isReference(): boolean;
    /** @returns {RecordReference?} */
    get referenceData(): any;
    /** @param {boolean} changed */
    set isChanged(changed: boolean);
    /** @returns {boolean} */
    get isChanged(): boolean;
    /** @param {BitView} unformattedValue */
    set unformattedValue(unformattedValue: BitView);
    /** @returns {BitView} */
    get unformattedValue(): BitView;
    /** @returns {FranchiseFileRecord} */
    get parent(): import("./FranchiseFileRecord.js").default;
    /** @param {OffsetTableEntry} offset */
    getValueAs(offset: OffsetTableEntry): any;
    _bubbleChangeToParent(): void;
    clearCachedValues(): void;
    _setUnformattedValueIfEmpty(): void;
    /** @param {BitView} unformattedValue */
    setUnformattedValueWithoutChangeEvent(unformattedValue: BitView): void;
    /** @returns {FranchiseEnumValue?} */
    _getEnumFromValue(value: any): FranchiseEnumValue | null;
    /** @param {BitView} unformatted, @param {OffsetTableEntry} offset */
    _parseFieldValue(unformatted: BitView, offset: OffsetTableEntry): any;
}
import FranchiseFileTable2Field from './FranchiseFileTable2Field.js';
import FranchiseFileTable3Field from './FranchiseFileTable3Field.js';
//# sourceMappingURL=FranchiseFileField.d.ts.map