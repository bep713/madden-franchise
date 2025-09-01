export default FranchiseEnum;
declare class FranchiseEnum {
    /** @param {string | FranchiseEnum} name @param {number} assetId @param {boolean} isRecordPersistent */
    constructor(name: string | FranchiseEnum, assetId: number, isRecordPersistent: boolean);
    /** @private */
    private _name;
    /** @private */
    private _assetId;
    /** @private */
    private _isRecordPersistent;
    /** @private */
    private _members;
    _maxLength: any;
    /** @returns {string} */
    get name(): string;
    /** @returns {number} */
    get assetId(): number;
    /** @returns {boolean} */
    get isRecordPersistent(): boolean;
    /** @returns {Array<FranchiseEnumValue>} */
    get members(): FranchiseEnumValue[];
    /** @param {string} name @param {number} index @param {string} value @param {string?} [unformattedValue] */
    addMember(name: string, index: number, value: string, unformattedValue?: string | null | undefined): void;
    /** @param {string} value @returns {FranchiseEnumValue?} */
    getMemberByValue(value: string): FranchiseEnumValue | null;
    /** @param {string} value @returns {FranchiseEnumValue?} */
    getMemberByUnformattedValue(value: string): FranchiseEnumValue | null;
    /** @param {string} name @returns {FranchiseEnumValue?} */
    getMemberByName(name: string): FranchiseEnumValue | null;
    setMemberLength(): void;
}
import FranchiseEnumValue from "./FranchiseEnumValue.js";
//# sourceMappingURL=FranchiseEnum.d.ts.map