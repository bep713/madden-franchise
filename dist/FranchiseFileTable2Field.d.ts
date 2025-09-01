export default FranchiseFileTable2Field;
declare class FranchiseFileTable2Field {
    /** @param {number} index @param {number} maxLength @param {FranchiseFileTable} parent */
    constructor(index: number, maxLength: number, parent: FranchiseFileTable);
    /** @private */
    private _value;
    /** @type {number} */
    rawIndex: number;
    isChanged: boolean;
    maxLength: number;
    /** @type {FranchiseFileField} */
    fieldReference: FranchiseFileField;
    /** @type {number} */
    lengthAtLastSave: number;
    /** @private */
    private _unformattedValue;
    index: number;
    _offset: number;
    _parent: FranchiseFileTable;
    set unformattedValue(value: any);
    get unformattedValue(): any;
    set value(value: string);
    get value(): string;
    get hexData(): any;
    /** @param {Table2FieldStrategy} strategy */
    set strategy(strategy: Table2FieldStrategy);
    /** @type {Table2FieldStrategy} */
    get strategy(): Table2FieldStrategy;
    _strategy: any;
    /** @param {number} offset */
    set offset(offset: number);
    /** @returns {number} */
    get offset(): number;
    /** @param {FranchiseFileTable} parent */
    set parent(parent: FranchiseFileTable);
    get parent(): FranchiseFileTable;
}
//# sourceMappingURL=FranchiseFileTable2Field.d.ts.map