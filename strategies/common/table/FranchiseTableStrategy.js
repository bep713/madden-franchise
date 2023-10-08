let FranchiseTableStrategy = {};

FranchiseTableStrategy.getTable2BinaryData = (table2Records, fullTable2Buffer) => {
    let table2Data = [];

    // Make sure to sort the table2 records by index
    const changedTable2Records = table2Records.filter((record) => { return record.isChanged; }).sort((a, b) => { return a.index - b.index; });
    let currentOffset = 0;

    for (let i = 0; i < changedTable2Records.length; i++) {
        let record = changedTable2Records[i];
        record.isChanged = false;
        const recordOffset = record.index;

        if (i > 0 && recordOffset === 0) {
            // this case is true for the last few rows with no data in them. They reference the first table2 value.
            continue;
        }

        const preData = fullTable2Buffer.slice(currentOffset, recordOffset);

        if (preData.length > 0) {
            table2Data.push(preData);
        }

        const recordHexData = record.hexData;
        table2Data.push(recordHexData);

        currentOffset = recordOffset + recordHexData.length;
    }

    if (table2Records.length > 0) {
        table2Data.push(fullTable2Buffer.slice(currentOffset));
    }

    return table2Data;
};

FranchiseTableStrategy.getMandatoryOffsets = (offsets) => {
    return [];
};

FranchiseTableStrategy.recalculateStringOffsets = (table, record) => {
    // First, calculate length allocated per record in table2
    const byteLengthPerRecord = table.offsetTable.filter((offsetEntry) => {
        return offsetEntry.type === 'string';
    }).reduce((accum, cur) => {
        return accum + cur.maxLength;
    }, 0);

    // Then, go through each string field sorted by offset index, and assign offsets to the table2 fields
    let runningOffset = 0;

    record.fieldsArray.filter((field) => {
        return field.offset.type === 'string';
    }).sort((a, b) => {
        return a.offset.index - b.offset.index;
    }).forEach((field) => {
        if (field.secondTableField) {
            field.secondTableField.offset = (record.index * byteLengthPerRecord) + runningOffset;
        }
        
        runningOffset += field.offset.maxLength;
    });
};

FranchiseTableStrategy.recalculateBlobOffsets = (table, record) => {
    // First, calculate length allocated per record in table2
    const byteLengthPerRecord = table.offsetTable.filter((offsetEntry) => {
        return offsetEntry.type === 'binaryblob';
    }).reduce((accum, cur) => {
        return accum + cur.maxLength + 2;   // +2 bytes for size, which is not considered in max length.
    }, 0);

    // Then, go through each string field sorted by offset index, and assign offsets to the table2 fields
    let runningOffset = 0;

    record.fieldsArray.filter((field) => {
        return field.offset.type === 'binaryblob';
    }).sort((a, b) => {
        return a.offset.index - b.offset.index;
    }).forEach((field) => {
        if (field.thirdTableField) {
            field.thirdTableField.offset = (record.index * byteLengthPerRecord) + runningOffset;
        }
        
        runningOffset += field.offset.maxLength;
    });
};

module.exports = FranchiseTableStrategy;