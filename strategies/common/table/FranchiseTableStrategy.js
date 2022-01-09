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
        break;
      }

      table2Data.push(fullTable2Buffer.slice(currentOffset, recordOffset));
      const recordHexData = record.hexData;
      table2Data.push(recordHexData);

      currentOffset = recordOffset + recordHexData.length;
    }

    table2Data.push(fullTable2Buffer.slice(currentOffset));

    return table2Data;
};

FranchiseTableStrategy.getMandatoryOffsets = (offsets) => {
    return [];
};

module.exports = FranchiseTableStrategy;