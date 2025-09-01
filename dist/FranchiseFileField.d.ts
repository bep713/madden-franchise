export default FranchiseFileField;
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
    get offset(): OffsetTableEntry;
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
    /** @param {OffsetTableEntry} offset */
    getValueAs(offset: OffsetTableEntry): any;
    _bubbleChangeToParent(): void;
    clearCachedValues(): void;
    _setUnformattedValueIfEmpty(): void;
    /** @param {BitView} unformattedValue @param {boolean} suppressErrors */
    setUnformattedValueWithoutChangeEvent(unformattedValue: BitView, suppressErrors: boolean): void;
    /** @returns {FranchiseEnumValue?} */
    _getEnumFromValue(value: any): FranchiseEnumValue | null;
    /** @param {BitView} unformatted, @param {OffsetTableEntry} offset */
    _parseFieldValue(unformatted: BitView, offset: OffsetTableEntry): any;
}
import FranchiseFileTable2Field from "./FranchiseFileTable2Field.js";
import FranchiseFileTable3Field from "./FranchiseFileTable3Field.js";
//# sourceMappingURL=FranchiseFileField.d.ts.map