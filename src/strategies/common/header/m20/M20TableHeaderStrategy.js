let M20TableHeaderStrategy = {};
M20TableHeaderStrategy.parseHeader = (data) => {
    const headerStart = 0x80;
    const tableName = readTableName(data);
    const isArray = tableName.indexOf('[]') >= 0;
    const tableId = data.readUInt32BE(headerStart);
    const tablePad1 = data.readUInt32BE(headerStart + 4);
    const tableUnknown1 = data.readUInt32BE(headerStart + 8);
    const tableUnknown2 = data.readUInt32BE(headerStart + 12);
    const tableUnknown3 = data.readUInt32BE(headerStart + 16);
    const data1Id = readTableName(data.slice(headerStart + 20, headerStart + 24));
    const data1Type = data.readUInt32BE(headerStart + 24);
    const data1Unknown1 = data.readUInt32BE(headerStart + 28);
    const data1Flag1 = data[headerStart + 32];
    const data1Flag2 = data[headerStart + 33];
    const data1Flag3 = data[headerStart + 34];
    const data1Flag4 = data[headerStart + 35];
    const tableStoreLength = data.readUInt32BE(headerStart + 36);
    let headerOffset = headerStart + 40;
    let records1SizeOffset = 1720;
    let tableStoreName = null;
    if (tableStoreLength > 0) {
        headerOffset += tableStoreLength;
        records1SizeOffset += tableStoreLength * 8;
        tableStoreName = readTableName(data.slice(headerStart + 40, headerStart + 40 + tableStoreLength));
    }
    const data1Offset = data.readUInt32BE(headerOffset);
    const data1TableId = data.readUInt32BE(headerOffset + 4);
    const data1RecordCount = data.readUInt32BE(headerOffset + 8);
    const data1Pad2 = data.readUInt32BE(headerOffset + 12);
    const table1Length = data.readUInt32BE(headerOffset + 16);
    const table2Length = data.readUInt32BE(headerOffset + 20);
    const data1Pad3 = data.readUInt32BE(headerOffset + 24);
    const data1Pad4 = data.readUInt32BE(headerOffset + 28);
    const data2Id = readTableName(data.slice(headerOffset + 32, headerOffset + 36));
    const table1Length2 = data.readUInt32BE(headerOffset + 36);
    const tableTotalLength = data.readUInt32BE(headerOffset + 40);
    const data2RecordWords = data.readUInt32BE(headerOffset + 44);
    const data2RecordCapacity = data.readUInt32BE(headerOffset + 48);
    const data2IndexEntries = data.readUInt32BE(headerOffset + 52);
    const unknown4 = data.readUInt32BE(headerOffset + 56);
    const nextRecordToUse = data.readUInt32BE(headerOffset + 60);
    let offsetStart = 0xE8 + tableStoreLength;
    const hasSecondTable = tableTotalLength > table1Length;
    let headerSize = offsetStart;
    let records1Size = data2RecordWords * 4;
    let table1StartIndex, table2StartIndex;
    if (tableStoreLength > 0) {
    }
    if (!isArray) {
        headerSize = headerSize + (data2IndexEntries * 4);
        table1StartIndex = headerSize;
        table2StartIndex = headerSize + (data1RecordCount * records1Size);
    }
    else {
        table1StartIndex = headerSize + (data1RecordCount * 4);
        table2StartIndex = table1StartIndex + (data1RecordCount * records1Size);
    }
    return {
        'name': tableName,
        'isArray': isArray,
        'tableId': tableId,
        'tablePad1': tablePad1,
        'uniqueId': tablePad1,
        'tableUnknown1': tableUnknown1,
        'tableUnknown2': tableUnknown2,
        'data1Id': data1Id,
        'data1Type': data1Type,
        'data1Unknown1': data1Unknown1,
        'data1Flag1': data1Flag1,
        'data1Flag2': data1Flag2,
        'data1Flag3': data1Flag3,
        'data1Flag4': data1Flag4,
        'tableStoreLength': tableStoreLength,
        'tableStoreName': tableStoreName,
        'data1Offset': data1Offset,
        'data1TableId': data1TableId,
        'data1RecordCount': data1RecordCount,
        'data1Pad2': data1Pad2,
        'table1Length': table1Length,
        'table2Length': table2Length,
        'data1Pad3': data1Pad3,
        'data1Pad4': data1Pad4,
        'headerSize': headerSize,
        'headerOffset': 0xE8,
        'record1SizeOffset': records1SizeOffset,
        'record1SizeLength': 10,
        'record1Size': records1Size,
        'offsetStart': offsetStart,
        'data2Id': data2Id,
        'table1Length2': table1Length2,
        'tableTotalLength': tableTotalLength,
        'hasSecondTable': hasSecondTable,
        'table1StartIndex': table1StartIndex,
        'table2StartIndex': table2StartIndex,
        'recordWords': data2RecordWords,
        'recordCapacity': data2RecordCapacity,
        'numMembers': data2IndexEntries,
        'nextRecordToUse': nextRecordToUse,
        'hasThirdTable': false
    };
};
M20TableHeaderStrategy.parseHeaderAttributesFromSchema = (schema, data, header) => {
    // headerSize = header.headerOffset + (schema.numMembers * 4) + header.tableStoreLength;
    // const binaryData = utilService.getBitArray(data.slice(0, headerSize));
    // let records1SizeNew = utilService.bin2dec(binaryData.slice(header.record1SizeOffset, header.record1SizeOffset + header.record1SizeLength));
    return {
        'headerSize': header.headerSize,
        'record1Size': header.record1Size,
        'table1StartIndex': header.table1StartIndex,
        'table2StartIndex': header.table2StartIndex
    };
};
function readTableName(data) {
    let name = '';
    let i = 0;
    do {
        name += String.fromCharCode(data[i]);
        i += 1;
    } while (i < data.length && data[i] !== 0);
    return name;
}
;
export default M20TableHeaderStrategy;
