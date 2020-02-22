const M19TableHeaderStrategy = require('../../common/header/m19/M19TableHeaderStrategy');

let M19TableStrategy = {};

M19TableStrategy.parseHeader = M19TableHeaderStrategy.parseHeader;
M19TableStrategy.parseHeaderAttributesFromSchema = M19TableHeaderStrategy.parseHeaderAttributesFromSchema;

// get table 2 binary data
// should return a list of buffers (or one buffer?)

// for FTC...
// find first changed record, splice onto old data...need to know old length. Repeat until no more changed records.
// or else just take the length, concat begin until start point, add new value and get hex data for every other table2 field? (slow?)

M19TableStrategy.getTable2BinaryData = (table2Records, fullTable2Buffer) => {
    let table2Data = [];

    const changedTable2Records = table2Records.filter((record) => { return record.isChanged; });
    let currentOffset = 0;

    for (let i = 0; i < changedTable2Records.length; i++) {
      let record = changedTable2Records[i];
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

M19TableStrategy.getMandatoryOffsets = (offsets) => {
  return [];
};

module.exports = M19TableStrategy;