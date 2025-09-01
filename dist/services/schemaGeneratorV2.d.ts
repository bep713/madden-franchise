/**
 * Parse FTX schema files with support for IncludeFile dependencies.
 * @param {{main: string, [id:string]: string}} fileMap - { main: '/abs/path/to/main.FTX', ...otherName: '/abs/path/to/other.FTX' }
 * @param {Object[]} [extraSchemas] - Optional array of extra schemas to include. If not included, will use defaults.
 * @returns {Promise<Object>} - Parsed schema object
 */
export function generateSchemaV2({ fileMap, extraSchemas }: {
    main: string;
    [id: string]: string;
}): Promise<any>;
//# sourceMappingURL=schemaGeneratorV2.d.ts.map