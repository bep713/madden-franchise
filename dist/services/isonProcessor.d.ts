export function isonVisualsToJson(fileBuf: any, gameYear?: number): {};
export function jsonVisualsToIson(jsonObj: any, gameYear?: number): any;
/**
 * ISON processor class that handles game year specific interned string lookups
 */
export class IsonProcessor {
    static ISON_HEADER: number;
    static ISON_OBJECT_START: number;
    static ISON_OBJECT_END: number;
    static ISON_ARRAY_START: number;
    static ISON_ARRAY_END: number;
    static ISON_INTERNED_STRING: number;
    static ISON_STRING: number;
    static ISON_KEYVALUEPAIR: number;
    static ISON_DOUBLE: number;
    static ISON_BYTE: number;
    static ISON_END: number;
    constructor(gameYear?: number);
    gameYear: number;
    stringLookup: any;
    reverseStringLookup: {};
    fileData: any;
    isonOffset: number;
    /**
     * Lazy load the interned string lookup for the specified game year
     */
    loadGameYearData(): void;
    /**
     * Static helper method for loading game year data (used for fallback)
     */
    loadGameYearDataStatic(gameYear: any): any;
    /**
     * Create a reverse lookup for JSON -> ISON conversion
     */
    populateReverseStringLookup(): void;
    /**
     * Convert ISON buffer to JSON object
     */
    isonVisualsToJson(fileBuf: any): {};
    /**
     * Convert JSON object to ISON buffer
     */
    jsonVisualsToIson(jsonObj: any): any;
    /**
     * Function to write the ISON data to a compressed buffer
     */
    writeTable3IsonData(isonBuffer: any): any;
    writeIsonFromJson(jsonObj: any): Buffer;
    writeBytes(buffer: any, offset: any, data: any): any;
    writeByte(buffer: any, offset: any, byte: any): any;
    writeDouble(buffer: any, offset: any, value: any): any;
    writeString(buffer: any, offset: any, value: any): any;
    jsonToIson(json: any, buffer: any, offset?: number): number;
    readBytes(length: any): any;
    decrementOffset(length?: number): void;
    readValue(): any;
    readArray(): any;
    readObject(): {};
}
//# sourceMappingURL=isonProcessor.d.ts.map