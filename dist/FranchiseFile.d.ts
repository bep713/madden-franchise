export = FranchiseFile;
/**
 * @typedef {Object} AssetTable
 * @param {number} assetId
 * @param {number} reference
 */
/**
   * @typedef {Object} RecordReference
   * @param {number} tableId
   * @param {number} rowNumber
   */
declare class FranchiseFile {
    /**
     *
     * @param {string} filePath
     * @param {FranchiseFileSettings?} [settings]
     * @returns {Promise<FranchiseFile>}
     */
    static create(filePath: string, settings?: FranchiseFileSettings | null): Promise<FranchiseFile>;
    /**
     *
     * @param {string} filePath
     * @param {FranchiseFileSettings} settings
     */
    constructor(filePath: string, settings: FranchiseFileSettings);
    /** @private @type {FranchiseFileSettings} */
    private _settings;
    isLoaded: boolean;
    /** @private @type {string} */
    private _filePath;
    /** @private @type {Buffer} */
    private _rawContents;
    /** @private @type {FileType} */
    private _type;
    /** @private @type {number} */
    private _gameYear;
    /** @private @type {SchemaMetadata} */
    private _expectedSchemaVersion;
    /** @type {Buffer} */
    packedFileContents: Buffer;
    /** @type {Buffer} */
    unpackedFileContents: Buffer;
    /**
     * @returns {Promise<void>}
     */
    parse(): Promise<void>;
    strategy: GameStrategy;
    schemaList: FranchiseSchema;
    /** @type {Array<FranchiseFileTable>} */
    tables: Array<FranchiseFileTable>;
    /** @type {Array<AssetTable>} */
    assetTable: Array<AssetTable>;
    /**
     *
     * @param {string} outputFilePath
     * @param {object} options
     * @returns {Promise<string>}
     */
    save(outputFilePath: string, options: object): Promise<string>;
    /**
     *
     * @param {string} outputFilePath
     * @param {object} options
     * @returns {Promise<string>}
     */
    packFile(outputFilePath: string, options: object): Promise<string>;
    /**
     * @returns {Buffer}
     */
    get rawContents(): Buffer;
    get openedFranchiseFile(): any;
    set filePath(path: string);
    /**
     * @returns {string}
     */
    get filePath(): string;
    /**
     * @returns {FranchiseSchema}
     */
    get schema(): FranchiseSchema;
    /**
     * @returns {SchemaMetadata}
     */
    get expectedSchemaVersion(): SchemaMetadata;
    set settings(settings: FranchiseFileSettings);
    /**
     * @returns {FranchiseFileSettings}
     */
    get settings(): FranchiseFileSettings;
    /**
     * @returns {number}
     */
    get gameYear(): number;
    /**
     * @returns {FileType}
     */
    get type(): FileType;
    /**
     *
     * @param {string} name
     * @returns {FranchiseFileTable?}
     */
    getTableByName(name: string): FranchiseFileTable | null;
    /**
     *
     * @param {string} name
     * @returns {Array<FranchiseFileTable>}
     */
    getAllTablesByName(name: string): Array<FranchiseFileTable>;
    /**
     *
     * @param {number} id
     * @returns {FranchiseFileTable?}
     */
    getTableById(id: number): FranchiseFileTable | null;
    /**
     *
     * @param {number} index
     * @returns {FranchiseFileTable?}
     */
    getTableByIndex(index: number): FranchiseFileTable | null;
    /**
     *
     * @param {number} id
     * @returns {FranchiseFileTable?}
     */
    getTableByUniqueId(id: number): FranchiseFileTable | null;
    /**
     *
     * @param {string} referenceValue
     * @returns {RecordReference}
     */
    getReferencedRecord(referenceValue: string): RecordReference;
    /**
     *
     * @param {number} assetId
     * @returns {RecordReference?}
     */
    getReferenceFromAssetId(assetId: number): RecordReference | null;
    /**
     * @typedef {Object} TableRecordReference
     * @param {number} tableId
     * @param {string} name
     * @param {FranchiseFileTable} table
     */
    /**
     *
     * @param {number} tableId
     * @param {number} recordIndex
     * @returns {Array<TableRecordReference>}
     */
    getReferencesToRecord(tableId: number, recordIndex: number): any[];
}
declare namespace FranchiseFile {
    export { FileType, SchemaMetadata, PartialSchemaMetadata, AssetTable, RecordReference };
}
import FranchiseSchema = require("./FranchiseSchema");
import FranchiseFileTable = require("./FranchiseFileTable");
type AssetTable = any;
import FranchiseFileSettings = require("./FranchiseFileSettings");
type FileType = {
    format: string;
    year: number;
    compressed: boolean;
};
type SchemaMetadata = {
    gameYear: string | null;
    major: number | null;
    minor: number | null;
    path: string | null;
};
type PartialSchemaMetadata = {
    major: number;
    minor: number;
};
type RecordReference = any;
//# sourceMappingURL=FranchiseFile.d.ts.map