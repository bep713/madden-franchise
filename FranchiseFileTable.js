const EventEmitter = require('events').EventEmitter;
const utilService = require('./services/utilService');
const FranchiseFileRecord = require('./FranchiseFileRecord');
const FranchiseFileTable2Field = require('./FranchiseFileTable2Field');
const FranchiseFileTable3Field = require('./FranchiseFileTable3Field');

class FranchiseFileTable extends EventEmitter {
  constructor(data, offset, gameYear, strategy, settings) {
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
    this.table3Records = [];
    this.arraySizes = [];
    this.emptyRecords = new Map();
    this._settings = settings;
  };

  get hexData () {
    this.updateBuffer();
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

  getBinaryReferenceToRecord(index) {
    return utilService.getBinaryReferenceData(this.header.tableId, index);
  };
  
  updateBuffer() {
    // need to check table2 & table3 data first because it may change offsets of the legit records.
    let table2Data = this.strategy.getTable2BinaryData(this.table2Records, this.data.slice(this.header.table2StartIndex));
    let table3Data = [];
    
    if (this.header.table3StartIndex) {
      table3Data = this.strategy.getTable3BinaryData(this.table3Records, this.data.slice(this.header.table3StartIndex));
    }
    
    // update table2 length and table total length in table header (only if records have been read)
    if (this.recordsRead) {
      let table2DataLength = 0;
      let table3DataLength = 0;

      // Get length of all table2Data sub arrays
      table2Data.forEach((arr) => {
        table2DataLength += arr.length;
      });

      table3Data.forEach((arr) => {
        table3DataLength += arr.length;
      });

      this.header.table2Length = table2DataLength;
      this.header.tableTotalLength = this.header.table1Length + this.header.table2Length;

      this.header.table3Length = table3DataLength;

      this.data.writeUInt32BE(this.header.table2Length , this.header.offsetStart - 44);
      this.data.writeUInt32BE(this.header.table3Length, this.header.offsetStart - 40);
      this.data.writeUInt32BE(this.header.tableTotalLength, this.header.offsetStart - 24);
    }

    const changedRecords = this.records.filter((record) => { return record.isChanged; });
    let currentOffset = 0;
    let bufferArrays = [];

    // Add all of the array sizes to the buffer if the table is an array and had a change
    if (this.isArray && changedRecords.length > 0) {
      // Push the header data
      bufferArrays.push(this.data.slice(currentOffset, this.header.headerSize));

      let arraySizeBuffer = Buffer.alloc(this.header.data1RecordCount * 4);

      this.arraySizes.forEach((arraySize, index) => {
        arraySizeBuffer.writeUInt32BE(arraySize, (index * 4));
      });

      bufferArrays.push(arraySizeBuffer);
      currentOffset += this.header.headerSize + this.header.data1RecordCount * 4;
    }

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

    if (!this.recordsRead && this.header.hasSecondTable && table2Data.length === 0) {
      table2Data = this.data.slice(this.header.table2StartIndex);
    }

    bufferArrays = bufferArrays.concat(table2Data);

    if (!this.recordsRead && this.header.hasThirdTable && table3Data.length === 0) {
      table3Data = this.data.slice(this.header.table3StartIndex);
    }

    bufferArrays = bufferArrays.concat(table3Data);

    this.data = Buffer.concat(bufferArrays);
  };

  setNextRecordToUse(index, resetEmptyRecordMap) {
    this._setNextRecordToUseBuffer(index);

    // Recalculate the empty record map if the option is set and the
    // records have already been read.
    if (resetEmptyRecordMap && this.recordsRead) {
      this.updateBuffer();
      this.emptyRecords = this._parseEmptyRecords();
    }

    this.emit('change');
  };

  _setNextRecordToUseBuffer(index) {
    // We need to update the table header to use this row next
    this.header.nextRecordToUse = index;

    // And finally update the buffer to reflect this change
    this.data.writeUInt32BE(index, this.header.offsetStart - 4);
  };

  recalculateEmptyRecordReferences() {
    // For this method, we are not going to assume any existing empty records.
    // We're going through each record and checking if it is an empty reference.
    // If so, we'll add it to the list. At the end we will check if there are any unreachable empty references
    // and update those accordingly.
    let emptyRecordReferenceIndicies = [];

    this.records.forEach((record) => {
      let isEmptyReference = false;
      const firstFourBytesReference = utilService.getReferenceDataFromBuffer(record.data.slice(0, 4));

      if (firstFourBytesReference.tableId === 0 && firstFourBytesReference.rowNumber !== 0) {
        // Could be a an empty record reference or a table2 field.
        // Check for a table2 field reference.
        const firstOffset = this.offsetTable[0];
        if (firstOffset.type !== 'string') {
          isEmptyReference = true;
          
          // Save the row number that this record points to.
          emptyRecordReferenceIndicies.push(firstFourBytesReference.rowNumber);
        }
      }

      record.isEmpty = isEmptyReference;
    });

    // We need to determine the starting node.
    // To do that, we need to find the empty record which no other empty record points to.
    const unreachableRecords = this.records.filter((record) => { return record.isEmpty; }).filter((record) => {
      return emptyRecordReferenceIndicies.indexOf(record.index) === -1;
    });

    // If there are more than 1 nodes which are not referenced, there is an issue
    if (unreachableRecords.length > 1) {
      const unreachableIndicies = unreachableRecords.map((record) => {
        return record.index;
      });

      console.warn(`(${this.header.tableId}) ${this.name} - More than one unreachable records found: `
      + `(${unreachableIndicies.join(', ')}). The game will most likely crash if you do not fix this problem. `
      + `The nextRecordToUse has NOT been updated.`);
    }
    else {
      let nextRecordToUse = this.header.recordCapacity;

      if (unreachableRecords.length === 1) {
        nextRecordToUse = unreachableRecords[0].index;
      }

      this._setNextRecordToUseBuffer(nextRecordToUse);
      this.emptyRecords = this._parseEmptyRecords();
      this.emit('change');
    }
  };

  async replaceRawData(buf, shouldReadRecords) {
    this.data = buf;

    // Reset fields
    this.recordsRead = false;
    this.header = this.strategy.parseHeader(this.data);
    this.name = this.header.name;
    this.isArray = this.header.isArray;
    this.loadedOffsets = [];
    this.isChanged = false;
    this.records = [];
    this.table2Records = [];
    this.table3Records = [];
    this.arraySizes = [];
    this.emptyRecords = new Map();

    this.emit('change');

    // Re-read records if desired
    if (shouldReadRecords) {
      return this.readRecords();
    }
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
          let arraySizes = [];

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
              'valueInSecondTable': false,
              'valueInThirdTable': false,
            }
            
            offset.isReference = !offset.enum && (offset.type[0] == offset.type[0].toUpperCase() || offset.type.includes('[]')) ? true : false,

            offsetTable.push(offset);
          }

          for (let i = 0; i < this.header.data1RecordCount; i++) {
            arraySizes.push(this.data.readUInt32BE(this.header.headerSize + (i * 4)));
          }

          this.offsetTable = offsetTable;
          this.arraySizes = arraySizes;
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

        this.records = readRecords(this.data, this.header, offsetTableToUse, this);
        
        if (this.header.hasSecondTable) {
          this._parseTable2Values(this.data, this.header, this.records);
        }

        if (this.header.hasThirdTable) {
          this._parseTable3Values(this.data, this.header, this.records);
        }

        this.emptyRecords = this._parseEmptyRecords();

        this.records.forEach((record, index) => {
          if (this.isArray) {
            record.arraySize = this.arraySizes[index];
          }

          if (this.emptyRecords.get(index)) {
            record.isEmpty = true;
          }
        });

        this.recordsRead = true;
        resolve(this);
      } else {
        resolve(this);
      }
    });
  };

  _parseEmptyRecords() {
    let emptyRecords = new Map();
    const firstEmptyRecord = this.header.nextRecordToUse;

    let previousEmptyRecordIndex = null;
    let currentEmptyRecordIndex = firstEmptyRecord;

    if (firstEmptyRecord !== this.header.recordCapacity) {
      while (currentEmptyRecordIndex !== this.header.recordCapacity) {
        // let nextEmptyRecordIndex = this.data.readUInt32BE(this.header.table1StartIndex + (currentEmptyRecordIndex * sizeOfEachRecord));
        let nextEmptyRecordIndex = this.records[currentEmptyRecordIndex].data.readUInt32BE(0);

        emptyRecords.set(currentEmptyRecordIndex, {
          previous: previousEmptyRecordIndex,
          next: nextEmptyRecordIndex
        });

        previousEmptyRecordIndex = currentEmptyRecordIndex;
        currentEmptyRecordIndex = nextEmptyRecordIndex;
      }
    }

    return emptyRecords;
  };

  _onRecordEmpty(record) {
    // First, check if the record is already empty. If so, don't do anything...
    // If not empty, then we need to empty it.
    if (!record.isEmpty) {
      record.isChanged = true;
      const lastEmptyRecordMapEntry = Array.from(this.emptyRecords).pop();

      // When we empty a record, we need to check if another empty record exists in the table.
      if (lastEmptyRecordMapEntry !== null && lastEmptyRecordMapEntry !== undefined) {

        // If an empty record already exists, we just need to get the last empty record
        // and update its index to point to the current record that we want to empty.
        const lastEmptyRecordIndex = lastEmptyRecordMapEntry[0];

        this.emptyRecords.set(lastEmptyRecordIndex, {
          previous: lastEmptyRecordMapEntry[1].previous,
          next: record.index
        });

        // Then we need to update the current record index to point to the record capacity.
        this.emptyRecords.set(record.index, {
          previous: lastEmptyRecordIndex,
          next: this.header.recordCapacity
        });

        // Finally, we need to update the buffers to reflect this data.
        // First, place the new referenced index (will be the first 4 bytes)
        // Next, fill the rest of the record with 0s (the last bytes of the record)

        // And update both record's data. This will set the unformatted and formatted values
        // without emitting an event
        this._changeRecordBuffers(lastEmptyRecordIndex, record.index);
        this._changeRecordBuffers(record.index, this.header.recordCapacity);
      }
      else {
        // In this case, the record that was emptied is the first empty record in the table
        this.emptyRecords.set(record.index, {
          previous: null,
          next: this.header.recordCapacity
        });

        // Finally update the table header and buffer so that the game uses this new empty
        // record as the next record to use (or fill)
        this.setNextRecordToUse(record.index);
        this._changeRecordBuffers(record.index, this.header.recordCapacity);
      }
      
      this.emit('change');
    }
  };

  _parseTable2Values(data, header, records) {
    const that = this;
    const secondTableData = data.slice(header.table2StartIndex);
  
    records.forEach((record) => {
      const fieldsReferencingSecondTable = record.fieldsArray.filter((field) => { return field.secondTableField; });
  
      fieldsReferencingSecondTable.forEach((field) => {
        field.secondTableField.unformattedValue = that.strategyBase.table2Field.getInitialUnformattedValue(field, secondTableData);
        field.secondTableField.strategy = that.strategyBase.table2Field;
        that.table2Records.push(field.secondTableField);
        field.secondTableField.parent = that;
      });
    });
  };
  
  _parseTable3Values(data, header, records) {
    const that = this;
    const thirdTableData = data.slice(header.table3StartIndex);

    records.forEach((record) => {
      const fieldsReferencingThirdTable = record.fieldsArray.filter((field) => { return field.thirdTableField; });
  
      fieldsReferencingThirdTable.forEach((field) => {
        field.thirdTableField.unformattedValue = that.strategyBase.table3Field.getInitialUnformattedValue(field, thirdTableData);
        field.thirdTableField.strategy = that.strategyBase.table3Field;
        that.table3Records.push(field.thirdTableField);
        field.thirdTableField.parent = that;
      });
    });
  };

  _changeRecordBuffers(index, emptyRecordReference) {
    this._setBufferToEmptyRecordReference(index, emptyRecordReference);
    this._setRecordInternalBuffer(index, emptyRecordReference);
  };

  _setBufferToEmptyRecordReference(index, emptyRecordReference) {
    const recordStartIndex = this.header.table1StartIndex + (index * this.header.record1Size)
    this.data.writeUInt32BE(emptyRecordReference, recordStartIndex);
    // that.data.fill(0, recordStartIndex + 4, recordStartIndex + that.header.record1Size);
  };

  _setRecordInternalBuffer(index, emptyRecordReference) {
    // let newData = utilService.dec2bin(emptyRecordReference, 32);

    // const recordSizeInBits = this.header.record1Size * 8;
    // if (recordSizeInBits > 32) {
    //   newData += this.records[index]._data.slice(32);
    // }

    // console.log(newData);

    this.records[index]._data.writeUInt32BE(emptyRecordReference, 0);
  };

  onEvent(name, object) {
    if (object instanceof FranchiseFileRecord) {
      if (name === 'change') {
        object.isChanged = true;

        if (this.isArray) {
          this.arraySizes[object.index] = object.arraySize;
        }

        // When a record changes, we need to check if it was previously empty
        // If so, we need to consider the record as no longer empty
        // So we need to adjust the empty records

        // First, check if the record's length is greater than 4 bytes (32 bits)
        // If less than 4 bytes, it can never become empty...probably. :)
        if (this.header.record1Size >= 4) {
          
          // Ex: Empty record list looks like object: A -> B -> C
          // When B's value is changed, the records need updated to: A -> C
          const emptyRecordReference = this.emptyRecords.get(object.index);
          const changedRecordWasEmpty = emptyRecordReference !== null && emptyRecordReference !== undefined;

          // Automatically un-empty the row if the setting is enabled and the changed record was empty.
          if (changedRecordWasEmpty) {

              // Check if the record's first four bytes still have a reference to the 0th table.
              // If so, then the record is still considered empty.
              
              // We need to check the buffer because the first field is not always a reference.
              // const referenceData = utilService.getReferenceDataFromBuffer(object.data.slice(0, 4));
              // if (referenceData.tableId !== 0 || referenceData.rowNumber > this.header.recordCapacity) {


              // if the changed field isn't included in the first 32 bits, zero out the first 32 bits. 
              // Otherwise, it's not necessary to zero out.
              const changedFieldsInFirst4Bytes = object.fieldsArray.filter((field) => { return field.isChanged && field.offset.indexOffset < 32; });
              if (this._settings.autoUnempty && changedFieldsInFirst4Bytes.length === 0) {
                // set first 4 bytes to 0
                this._changeRecordBuffers(object.index, 0);

                // invalidate the cached values since we set the buffer directly
                const fieldsInFirst4Bytes = object.fieldsArray.filter((field) => { return field.offset.indexOffset < 32; });
                fieldsInFirst4Bytes.forEach((field) => { 
                  field.clearCachedValues();
                });
              }
              
              // If autoUnempty is disabled, only un-empty the row if a field in the first 4 bytes changed.
              // If autoUnempty is enabled, un-empty the row if ANY field changed.
              if (this._settings.autoUnempty || changedFieldsInFirst4Bytes.length > 0) {
                // if the record contains any string values, point the string values to
                // their correct offsets
                this.strategy.recalculateStringOffsets(this, object);
                this.strategy.recalculateBlobOffsets(this, object);

                // Delete the empty record entry because it is no longer empty
                this.emptyRecords.delete(object.index);

                // Set the isEmpty back to false because it's no longer empty
                object.isEmpty = false;

                // Check if there is a previous empty record
                const previousEmptyReference = this.emptyRecords.get(emptyRecordReference.previous);

                if (previousEmptyReference) {
                  // Set the previous empty record to point to the old reference's next node
                  this.emptyRecords.set(emptyRecordReference.previous, {
                    previous: this.emptyRecords.get(emptyRecordReference.previous).previous,
                    next: emptyRecordReference.next
                  });

                  // change the table buffer and record buffer to reflect object change
                  this._changeRecordBuffers(emptyRecordReference.previous, emptyRecordReference.next);
                }

                // If there is a next empty reference, update the previous value accordingly to now point
                // to the current record's previous index.
                const nextEmptyReference = this.emptyRecords.get(emptyRecordReference.next);

                if (nextEmptyReference) {
                  this.emptyRecords.set(emptyRecordReference.next, {
                    previous: emptyRecordReference.previous,
                    next: this.emptyRecords.get(emptyRecordReference.next).next
                  });

                  if (!previousEmptyReference) {
                    // If no previous empty record exists and a next record exists, we need to update the header to
                    // point to object record as the next record to use.
                    this.setNextRecordToUse(emptyRecordReference.next);
                  }
                }

                // If there are no previous or next empty references
                // Then there are no more empty references in the table
                // Update the table header nextRecordToUse back to the table record capacity
                if (!previousEmptyReference && !nextEmptyReference) {
                  this.setNextRecordToUse(this.header.recordCapacity);
                }
              }
            // }
          }
        }

        this.emit('change');
      }
      else if (name === 'empty') {
        this._onRecordEmpty(object);
        this.emit('change');
      }
    }
    else if (object instanceof FranchiseFileTable2Field || object instanceof FranchiseFileTable3Field) {
      object.isChanged = true;
      
      // When a table2 field changes, we need to check if the record is empty. If so, we need to mark it as not empty. 
      if (object.fieldReference) {
        this.onEvent('change', object.fieldReference._parent);
      }
      else {
        // Only emit change here if the field reference is empty.
        // the onEvent call will emit a change in the above condition.
        this.emit('change');
      }
    }
  };
};

module.exports = FranchiseFileTable;

function readOffsetTable(data, schema, header) {
  let currentIndex = header.offsetStart;
  let offsetTable = parseOffsetTableFromData();
  // console.log(offsetTable.sort((a,b) => { return a.indexOffset - b.indexOffset}))
  sortOffsetTableByIndexOffset();

  function isSkippedOffset(offset) {
    return offset.final || offset.const || offset.type.indexOf('()') >= 0 || offset.type === 'ITransaction_Sleep';
  };

  for(let i = 0; i < offsetTable.length; i++) {
    let curOffset = offsetTable[i];
    let nextOffset = offsetTable.length > i + 1 ? offsetTable[i+1] : null;

    if (nextOffset) {
      let curIndex = i+2;
      while(nextOffset && isSkippedOffset(nextOffset)) {
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
        if (isSkippedOffset(currentOffset)) {
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

  offsetTable = offsetTable.filter((offset) => { return !(isSkippedOffset(offset)) });
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
        'isReference': !attribute.enum && (attribute.type[0] == attribute.type[0].toUpperCase() || attribute.type.includes('[]') || attribute.type === 'record') ? true : false,
        'valueInSecondTable': header.hasSecondTable && attribute.type === 'string',
        'valueInThirdTable': header.hasThirdTable && attribute.type === 'binaryblob',
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

function readRecords(data, header, offsetTable, table) {
  // const binaryData = utilService.getBitArray(data.slice(header.table1StartIndex, header.table2StartIndex));
  let records = [];

  if (data) {
    let index = 0;

    for (let i = header.table1StartIndex; i < header.table2StartIndex; i += header.record1Size) {
      // const recordBinary = binaryData.slice(i, i + (header.record1Size * 8));
      let record = new FranchiseFileRecord(data.slice(i, i + header.record1Size), index, offsetTable, table);
      records.push(record);

      index += 1;
    }
  }

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