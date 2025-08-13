export default utilService;
declare namespace utilService {
    function intersection(arrayOfArrays: any): any;
    function dec2bin(dec: any, len: any): string;
    function bin2dec(binary: any): number;
    function bin2Float(binary: any): number;
    function float2Bin(float: any): string;
    function uintToInt(uint: any, nbit: any): any;
    function hex2bin(hex: any): string;
    function bin2hex(bin: any): string;
    function chunk(str: any, n: any): any[];
    function binaryBlockToHexBlock(binary: any): any[];
    function binaryBlockToDecimalBlock(binary: any): any[];
    function getBitArray(data: any): any;
    function replaceAt(oldValue: any, index: any, value: any): any;
    function byteArrayToLong(byteArray: any, reverse: any): number;
    function show(element: any): void;
    function hide(element: any): void;
    function arrayMove(arr: any, old_index: any, new_index: any): any;
    function removeChildNodes(node: any): void;
    function isString(str: any): boolean;
    function stringOnlyContainsBinaryDigits(str: any): boolean;
    function readDWordAt(index: any, data: any, le: any): number;
    function toUint32(x: any): number;
    function modulo(a: any, b: any): number;
    function toInteger(x: any): number;
    function getReferenceData(value: any): {
        tableId: number;
        rowNumber: number;
    };
    function getReferenceDataFromBuffer(buf: any): {
        tableId: any;
        rowNumber: any;
    };
    function getReferenceDataFromBitview(bv: any, start?: number): {
        tableId: any;
        rowNumber: any;
    };
    function getBinaryReferenceData(tableId: any, rowNumber: any): string;
}
//# sourceMappingURL=utilService.d.ts.map