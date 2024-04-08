export let eventEmitter: any;
/** @param {string} inputFile @param {boolean?} [showOutput] @param {string?} [outputFile] */
export function generate(inputFile: string, showOutput?: boolean, outputFile?: string): void;
/** @param {ReadableStream} stream @param {boolean?} [showOutput] @param {string?} [outputFile] */
export function generateFromStream(stream: ReadableStream<any>, showOutput?: boolean, outputFile?: string): void;
/** @returns {Record<string, any>} */
export function getExtraSchemas(): Record<string, any>;
/** @param {Array<TableSchema>} schemaList */
export function calculateInheritedSchemas(schemaList: TableSchema[]): void;
//# sourceMappingURL=schemaGenerator.d.ts.map