export default FranchiseFileTable2Field;
export type FranchiseFileTable = import('./FranchiseFileTable').default;
export type FranchiseFileField = import('./FranchiseFileField').default;
export type Table2FieldStrategy = import('./strategies/StrategyPicker').Table2FieldStrategy;
/**
 * @typedef {import('./FranchiseFileTable').default} FranchiseFileTable
 * @typedef {import('./FranchiseFileField').default} FranchiseFileField
 * @typedef {import('./strategies/StrategyPicker').Table2FieldStrategy} Table2FieldStrategy
 */
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
    _parent: import("./FranchiseFileTable").default;
    set unformattedValue(value: any);
    get unformattedValue(): any;
    set value(value: string);
    get value(): string;
    get hexData(): any;
    /** @param {Table2FieldStrategy} strategy */
    set strategy(strategy: import("./strategies/StrategyPicker").Table2FieldStrategy);
    /** @type {Table2FieldStrategy} */
    get strategy(): import("./strategies/StrategyPicker").Table2FieldStrategy;
    _strategy: import("./strategies/StrategyPicker").Table2FieldStrategy | undefined;
    /** @param {number} offset */
    set offset(offset: number);
    /** @returns {number} */
    get offset(): number;
    /** @param {FranchiseFileTable} parent */
    set parent(parent: import("./FranchiseFileTable").default);
    get parent(): import("./FranchiseFileTable").default;
}
//# sourceMappingURL=FranchiseFileTable2Field.d.ts.map