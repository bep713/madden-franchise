export default FranchiseEnumValue;
declare class FranchiseEnumValue {
    /** @param {string} name @param {number} index @param {string} value @param {string?} [unformattedValue] */
    constructor(name: string, index: number, value: string, unformattedValue?: string | null | undefined);
    /** @private */
    private _name;
    /** @private */
    private _index;
    /** @private */
    private _value;
    /** @private */
    private _unformattedValue;
    get name(): string;
    get index(): number;
    get value(): number;
    /** @returns {string?} */
    get unformattedValue(): string | null;
    /** @param {number} length */
    setMemberLength(length: number): void;
}
//# sourceMappingURL=FranchiseEnumValue.d.ts.map