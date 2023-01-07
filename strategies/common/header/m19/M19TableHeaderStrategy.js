const utilService = require('../../../../services/utilService');

let M19TableHeaderStrategy = {};

M19TableHeaderStrategy.parseHeader = (data) => {
    const headerStart = 0x80;
    const tableName = readTableName(data);
    const isArray = tableName.indexOf('[]') >= 0;

    const tableId = data.readUInt32BE(headerStart);
    const tablePad1 = data.readUInt32BE(headerStart+4);
    const tableUnknown1 = data.readUInt32BE(headerStart+8);
    const tableUnknown2 = data.readUInt32BE(headerStart+12);
    const data1Id = readTableName(data.slice(headerStart+16, headerStart+20));
    const data1Type = data.readUInt32BE(headerStart+20);
    const data1Unknown1 = data.readUInt32BE(headerStart+24);
    const data1Flag1 = data[headerStart+28];
    const data1Flag2 = data[headerStart+29];
    const data1Flag3 = data[headerStart+30];
    const data1Flag4 = data[headerStart+31];
    const tableStoreLength = data.readUInt32BE(headerStart+32);

    let headerOffset = headerStart+36;
    let records1SizeOffset = 1689;
    let tableStoreName = null;

    if (tableStoreLength > 0) {
        headerOffset += tableStoreLength;
        records1SizeOffset += tableStoreLength * 8;
        tableStoreName = readTableName(data.slice(headerStart+36, headerStart+36+tableStoreLength));
    }

    const data1Offset = data.readUInt32BE(headerOffset);
    const data1TableId = data.readUInt32BE(headerOffset+4);
    const data1RecordCount = data.readUInt32BE(headerOffset+8);
    const data1Pad2 = data.readUInt32BE(headerOffset+12);
    const table1Length = data.readUInt32BE(headerOffset+16);
    const table2Length = data.readUInt32BE(headerOffset+20);
    const data1Pad3 = data.readUInt32BE(headerOffset+24);
    const data1Pad4 = data.readUInt32BE(headerOffset+28);
    const data2Id = readTableName(data.slice(headerOffset+32, headerOffset+36));
    const table1Length2 = data.readUInt32BE(headerOffset+36);
    const tableTotalLength = data.readUInt32BE(headerOffset+40);
    const data2RecordWords = data.readUInt32BE(headerOffset+44);
    const data2RecordCapacity = data.readUInt32BE(headerOffset+48);
    const data2IndexEntries = data.readUInt32BE(headerOffset+52);
    const unknown4 = data.readUInt32BE(headerOffset+56);
    const nextRecordToUse = data.readUInt32BE(headerOffset+60);

    let offsetStart = 0xE4 + tableStoreLength;
    const hasSecondTable = tableTotalLength > table1Length;

    let headerSize = 0;
    let records1Size = 0;

    if (isArray) {
        headerSize = 0xE4 + tableStoreLength;
        // const binaryData = utilService.getBitArray(data.slice(0, headerSize));
        records1Size = data2RecordWords * 4;
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
        'headerOffset': 0xE4,
        'record1SizeOffset': records1SizeOffset,
        'record1SizeLength': 9,
        'record1Size': records1Size,
        'offsetStart': offsetStart,
        'data2Id': data2Id,
        'table1Length2': table1Length2,
        'tableTotalLength': tableTotalLength,
        'hasSecondTable': hasSecondTable,
        'table1StartIndex': tableStoreLength === 0 && !isArray ? headerSize : headerSize + (data1RecordCount * 4),
        'table2StartIndex': tableStoreLength === 0 && !isArray ? headerSize + (data1RecordCount * records1Size) : headerSize + (data1RecordCount * 4) + (data1RecordCount * records1Size),
        'recordWords': data2RecordWords,
        'recordCapacity': data2RecordCapacity,
        'numMembers': data2IndexEntries,
        'nextRecordToUse': nextRecordToUse
    };
};

M19TableHeaderStrategy.parseHeaderAttributesFromSchema = (schema, data, header) => {
    if (header.isArray) {
        return {
            'headerSize': header.headerSize,
            'record1Size': header.record1Size,
            'table1StartIndex': header.table1StartIndex,
            'table2StartIndex': header.table2StartIndex
        }
    }
    else {
        headerSize = header.headerOffset + (schema.numMembers * 4) + header.tableStoreLength;
        const binaryData = utilService.getBitArray(data.slice(0, headerSize));
        records1Size = utilService.bin2dec(binaryData.slice(header.record1SizeOffset, header.record1SizeOffset + header.record1SizeLength));

        return {
            'headerSize': headerSize,
            'record1Size': records1Size,
            'table1StartIndex': headerSize,
            'table2StartIndex': headerSize + (header.data1RecordCount * records1Size)
        };
    }
};

module.exports = M19TableHeaderStrategy;

function readTableName(data) {
    let name = '';

    let i = 0;

    do {
        name += String.fromCharCode(data[i]);
        i += 1;
    }
    while (i < data.length && data[i] !== 0);

    return name;
};