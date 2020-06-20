const assert = require('assert');
const EventEmitter = require('events').EventEmitter;
const utilService = require('./services/utilService');
const FranchiseFileRecord = require('./FranchiseFileRecord');

class FranchiseFileTable extends EventEmitter {
  constructor(data, offset, gameYear, strategy) {
    super();
    this.index = -1;
    this.data = data;
    this.lengthAtLastSave = data.length;
    this.offset = offset;
    this.strategyBase = strategy;
    this.strategy = this.strategyBase.table;
    this.recordsRead = false;
    this._gameYear = gameYear; 
    this.header = this.strategy.parseHeader(this.data);
    this.name = this.header.name;
    this.isArray = this.header.isArray;
    this.loadedOffsets = [];
    this.isChanged = false;
    this.records = [];
    this.table2Records = [];
  };

  get hexData () {
    // need to check table2 data first because it may change offsets of the legit records.
    const table2Data = this.strategy.getTable2BinaryData(this.table2Records, this.data.slice(this.header.table2StartIndex));

    const changedRecords = this.records.filter((record) => { return record.isChanged; });
    let currentOffset = 0;
    let bufferArrays = [];

    for (let i = 0; i < changedRecords.length; i++) {
      let record = changedRecords[i];
      record.isChanged = false;
      const recordOffset = this.header.table1StartIndex + (record.index * this.header.record1Size);
      
      bufferArrays.push(this.data.slice(currentOffset, recordOffset));
      const recordHexData = record.hexData;
      bufferArrays.push(recordHexData);
      currentOffset = recordOffset + recordHexData.length;
    }

    bufferArrays.push(this.data.slice(currentOffset, this.header.table2StartIndex));
    bufferArrays = bufferArrays.concat(table2Data);

    this.data = Buffer.concat(bufferArrays);
    return this.data;
  };

  set schema (schema) {
    // console.time('set schema');
    this._schema = schema;
    const modifiedHeaderAttributes = this.strategy.parseHeaderAttributesFromSchema(schema, this.data, this.header);

    this.header.headerSize = modifiedHeaderAttributes.headerSize;
    this.header.record1Size = modifiedHeaderAttributes.record1Size;
    this.header.table1StartIndex = modifiedHeaderAttributes.table1StartIndex;
    this.header.table2StartIndex = modifiedHeaderAttributes.table2StartIndex;
    // console.timeEnd('set schema');
  };

  get schema () {
    return this._schema;
  };

  // attribsToLoad is an array of attribute names (strings) to load. It is optional - if nothing is provided to the function it will load all attributes.
  readRecords (attribsToLoad) {
    return new Promise((resolve, reject) => {
      if (!this.recordsRead || isLoadingNewOffsets(this.loadedOffsets, attribsToLoad, this.offsetTable)) {
        if (this.schema) {
          this.offsetTable = readOffsetTable(this.data, this.schema, this.header);
        } else if (this.isArray) {
          const numberOfFields = this.header.record1Size / 4;
          let offsetTable = [];

          for (let i = 0; i < numberOfFields; i++) {
            const offset = {
              'final': false,
              'index': i,
              'indexOffset': i * 32,
              'isSigned': false,
              'length': 32,
              'maxLength': null,
              'maxValue': null,
              'minValue': null,
              'name': `${this.name.substring(0, this.name.length - 2)}${i}`,
              'offset': i * 32,
              'type': this.name.substring(0, this.name.length - 2),
              'valueInSecondTable': false
            }
            
            offset.isReference = !offset.enum && (offset.type[0] == offset.type[0].toUpperCase() || offset.type.includes('[]')) ? true : false,

            offsetTable.push(offset);
          }

          this.offsetTable = offsetTable;
        } else {
          reject('Cannot read records: Schema is not defined.');
        }

        let offsetTableToUse = this.offsetTable;

        const mandatoryOffsetsToLoad = this.strategy.getMandatoryOffsets(this.offsetTable);
        
        if (attribsToLoad) {
          // get any new attributes to load plus the existing loaded offsets
          offsetTableToUse = offsetTableToUse.filter((attrib) => { 
            return mandatoryOffsetsToLoad.includes(attrib.name)
              || attribsToLoad.includes(attrib.name) 
              || this.loadedOffsets.find((offset) => { return offset.name === attrib.name; }); 
          });
        }

        this.loadedOffsets = offsetTableToUse;
        this.records = readRecords(this.data, this.header, offsetTableToUse);

        if (this.header.hasSecondTable) {
          this._parseTable2Values(this.data, this.header, this.records);
        }

        this.records.forEach((record, index) => {
          const that = this;
          record.on('change', function () {
            this.isChanged = true;
            that.emit('change');
          });
        });

        this.table2Records.forEach((record, index) => {
          const that = this;

          record.on('change', function (secondTableField) {
            this.isChanged = true;
            that.emit('change');
          });
        });

        this.recordsRead = true;
        resolve(this);
      } else {
        resolve(this);
      }
    });
  };

  _parseTable2Values(data, header, records) {
    const that = this;
    const secondTableData = data.slice(header.table2StartIndex);
  
    records.forEach((record) => {
      const fieldsReferencingSecondTable = record._fields.filter((field) => { return field.secondTableField; });
  
      fieldsReferencingSecondTable.forEach((field) => {
        field.secondTableField.unformattedValue = that.strategyBase.table2Field.getInitialUnformattedValue(field, secondTableData);
        field.secondTableField.strategy = that.strategyBase.table2Field;
        that.table2Records.push(field.secondTableField);
      });
    });
  };
};

module.exports = FranchiseFileTable;

function readOffsetTable(data, schema, header) {
  let currentIndex = header.offsetStart;
  let offsetTable = parseOffsetTableFromData();
  // console.log(offsetTable.sort((a,b) => { return a.indexOffset - b.indexOffset}))
  sortOffsetTableByIndexOffset();

  for(let i = 0; i < offsetTable.length; i++) {
    let curOffset = offsetTable[i];
    let nextOffset = offsetTable.length > i + 1 ? offsetTable[i+1] : null;

    if (nextOffset) {
      let curIndex = i+2;
      while(nextOffset && (nextOffset.final || nextOffset.const || nextOffset.type.indexOf('()') >= 0)) {
        nextOffset = offsetTable[curIndex];
        curIndex += 1;
      }

      if (nextOffset) {
        curOffset.length = nextOffset.indexOffset - curOffset.indexOffset;  
      } else {
        curOffset.length = (header.record1Size * 8) - curOffset.indexOffset;
      }      
    }
    else {
      curOffset.length = (header.record1Size * 8) - curOffset.indexOffset;
    }

    if (curOffset.length > 32) {
      curOffset.length = 32;
    }
  }

  let currentOffsetIndex = 0;
  let chunked32bit = [];
 
  for (let i = 0; i < header.record1Size * 8; i += 32) {
    let chunkedOffsets = [];
    let offsetLength = i % 32;

    do {
      const currentOffset = offsetTable[currentOffsetIndex];

      if (currentOffset) {
        if (currentOffset.final || currentOffset.const || currentOffset.type.indexOf('()') >= 0) {
          currentOffsetIndex += 1;
          continue;
        }
        
        offsetLength += currentOffset.length;
        chunkedOffsets.push(currentOffset);
  
        currentOffsetIndex += 1;
      } else {
        break;
      }
    } while((currentOffsetIndex < offsetTable.length) && offsetLength < 32);

    chunked32bit.push(chunkedOffsets);
  }

  chunked32bit.forEach((offsetArray) => {
    if (offsetArray.length > 0) {
      let currentOffset = offsetArray[0].indexOffset;
      offsetArray[offsetArray.length - 1].offset = currentOffset;

      for (let i = offsetArray.length - 2; i >= 0; i--) {
        let previousOffset = offsetArray[i+1];
        let offset = offsetArray[i];
        offset.offset = previousOffset.offset + previousOffset.length;
      }
    }
  });

  offsetTable = offsetTable.filter((offset) => { return !offset.final && !offset.const && offset.type.indexOf('()') === -1; });
  offsetTable.sort((a,b) => { return a.offset - b.offset; });
  
  for (let i = 0; i < offsetTable.length; i++) {
    schema.attributes[offsetTable[i].index].offsetIndex = i;
  }

  return offsetTable;

  function sortOffsetTableByIndexOffset() {
    offsetTable.sort((a, b) => { return a.indexOffset - b.indexOffset; });
  };

  function parseOffsetTableFromData() {
    let table = [];

    schema.attributes.forEach((attribute, index) => {
      const minValue = parseInt(attribute.minValue);
      const maxValue = parseInt(attribute.maxValue);

      table.push({
        'index': index,
        'originalIndex': parseInt(attribute.index),
        'name': attribute.name,
        'type': (minValue < 0 || maxValue < 0) ? 's_' + attribute.type : attribute.type,
        'isReference': !attribute.enum && (attribute.type[0] == attribute.type[0].toUpperCase() || attribute.type.includes('[]')) ? true : false,
        'valueInSecondTable': header.hasSecondTable && attribute.type === 'string',
        'isSigned': minValue < 0 || maxValue < 0,
        'minValue': minValue,
        'maxValue': maxValue,
        'maxLength': attribute.maxLength ? parseInt(attribute.maxLength) : null,
        'final': attribute.final === 'true' ? true : false,
        'indexOffset': utilService.byteArrayToLong(data.slice(currentIndex, currentIndex + 4), true),
        'enum': attribute.enum,
        'const': attribute.const
      });
      currentIndex += 4;
    });

    return table;
  };
};

function readRecords(data, header, offsetTable) {
  // const binaryData = utilService.getBitArray(data.slice(header.table1StartIndex, header.table2StartIndex));

  let records = [];

  // if (binaryData) {
    for (let i = header.table1StartIndex; i < header.table2StartIndex; i += (header.record1Size)) {
      const recordData = data.subarray(i, i + header.record1Size);
      records.push(new FranchiseFileRecord(recordData, (i / (header.record1Size * 8)), offsetTable));
    }
  // }

  return records;
};

function isLoadingNewOffsets(currentlyLoaded, attribsToLoad, offsetTable) {
  const names = currentlyLoaded.map((currentlyLoadedOffset) => { return currentlyLoadedOffset.name; });

  if (attribsToLoad) {
    let newAttribs = attribsToLoad.filter((attrib) => {
      return !names.includes(attrib);
    });
  
    return newAttribs.length > 0;
  }
  else {
    return currentlyLoaded.length !== offsetTable.length;
  }
};