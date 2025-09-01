export default schemaGenerator;
declare namespace schemaGenerator {
    let eventEmitter: EventEmitter;
    /** @param {string} inputFile @param {boolean?} [showOutput] @param {string?} [outputFile] */
    function generate(inputFile: string, showOutput?: boolean, outputFile?: string): void;
    /** @param {ReadableStream} stream @param {boolean?} [showOutput] @param {string?} [outputFile] */
    function generateFromStream(stream: ReadableStream, showOutput?: boolean, outputFile?: string): void;
    /** @returns {Record<string, any>} */
    function getExtraSchemas(): Record<string, any>;
    /** @param {Array<TableSchema>} schemaList */
    function calculateInheritedSchemas(schemaList: TableSchema[]): void;
}
import { EventEmitter } from 'events';
//# sourceMappingURL=schemaGenerator.d.ts.map