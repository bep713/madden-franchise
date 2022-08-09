const fs = require('fs');
const zlib = require('zlib');
const Constants = require('./Constants');
// const debug = require('debug')('madden-franchise');
const EventEmitter = require('events').EventEmitter;
const FranchiseSchema = require('./FranchiseSchema');
const utilService = require('./services/utilService');
const FranchiseFileTable = require('./FranchiseFileTable');
const StrategyPicker = require('./strategies/StrategyPicker');
const FranchiseFileSettings = require('./FranchiseFileSettings');
const schemaPickerService = require('./services/schemaPicker');

const COMPRESSED_FILE_LENGTH = 2936094;
const COMPRESSED_DATA_OFFSET = 0x52;

class FranchiseFile extends EventEmitter {
  constructor(filePath, settings) {
    super();
    this._settings = new FranchiseFileSettings(settings);
    this.isLoaded = false;

    if (Array.isArray(filePath)) {
      this._filePath = filePath[0];
    } else {
      this._filePath = filePath;
    }
    
    this._rawContents = fs.readFileSync(filePath);
    this._type = getFileType(this._rawContents);
    this._gameYear = this._type.year;
    this._expectedSchemaVersion = getSchemaMetadata(this.rawContents, this._type);

    if (this._type.compressed) {
      this.packedFileContents = this._rawContents;
      this.unpackedFileContents = unpackFile(this._rawContents, this._type);

      if (this._type.format === Constants.FORMAT.FRANCHISE_COMMON) {
        const newType = getFileType(this.unpackedFileContents);
        this._type.year = newType.year;
        this._gameYear = this._type.year;
        this._expectedSchemaVersion = getSchemaMetadata(this.unpackedFileContents, newType);
      }
    }
    else {
      this.unpackedFileContents = this._rawContents;
    }

    if (this._settings.autoParse) {
      this.parse();
    }
  };

  parse() {
    const that = this;
    this.strategy = StrategyPicker.pick(this.type);

    let schemaPromise = new Promise((resolve, reject) => {
      const schemaMeta = this.settings.schemaOverride ? this.settings.schemaOverride : this.expectedSchemaVersion;

      const schemaPath = this.settings.schemaOverride && this.settings.schemaOverride.path ? 
        this.settings.schemaOverride.path : schemaPickerService.pick(this._gameYear, schemaMeta.major, schemaMeta.minor, this.settings).path;

      try {
        this.schemaList = new FranchiseSchema(schemaPath);
        this.schemaList.on('schemas:done', () => {
          resolve();
        });

        this.schemaList.evaluate();
      }
      catch (err) {
        reject(err);
      }
    });

    let tablePromise = new Promise((resolve, reject) => {
      const firstCheck = 0x53;
      const secondCheck = 0x50;
      const thirdCheck = 0x42;
      const fourthCheck = 0x46;

      const altFirstCheck = 0x41;
      const altSecondCheck = 0x53;
      const altThirdCheck = 0x54;
      const altFourthCheck = 0x4F;

      const alt2FirstCheck = 0x53;
      const alt2SecondCheck = 0x50;
      const alt2ThirdCheck = 0x45;
      const alt2FourthCheck = 0x58;

      const tableIndicies = [];

      for (let i = 0; i <= this.unpackedFileContents.length - 4; i+=1) {
        if ((this.unpackedFileContents[i] === firstCheck
          && this.unpackedFileContents[i+1] === secondCheck
          && this.unpackedFileContents[i+2] === thirdCheck
          && this.unpackedFileContents[i+3] === fourthCheck) ||
          (this.unpackedFileContents[i] === altFirstCheck
          && this.unpackedFileContents[i+1] === altSecondCheck
          && this.unpackedFileContents[i+2] === altThirdCheck
          && this.unpackedFileContents[i+3] === altFourthCheck) ||
          (this.unpackedFileContents[i] === alt2FirstCheck
          && this.unpackedFileContents[i+1] === alt2SecondCheck
          && this.unpackedFileContents[i+2] === alt2ThirdCheck
          && this.unpackedFileContents[i+3] === alt2FourthCheck)) {
            const tableStart = i - getTableStartOffsetByGameYear(this._gameYear);
            tableIndicies.push(tableStart);
          }
      }

      this.tables = [];

      for (let i = 0; i < tableIndicies.length; i++) {
        const currentTable = tableIndicies[i];
        const nextTable = tableIndicies.length > i+1 ? tableIndicies[i+1] : this.unpackedFileContents.length - 8;  // Ignore trailing 8 bytes on last table

        const tableData = this.unpackedFileContents.slice(currentTable, nextTable);

        const newFranchiseTable = new FranchiseFileTable(tableData, currentTable, this._gameYear, this.strategy);
        newFranchiseTable.index = i;
        this.tables.push(newFranchiseTable);

        newFranchiseTable.on('change', function () {
          this.isChanged = true;

          if (that.settings.saveOnChange) {
            that.packFile();
          }

          that.emit('change', newFranchiseTable);
        });
      }

      resolve();
    });

    let assetTablePromise = new Promise((resolve, reject) => {
      this.assetTable = [];

      const assetTableOffset = this.unpackedFileContents.readUInt32BE(4);
      const assetTableEntries = this.unpackedFileContents.readUInt32BE(36);

      let currentOffset = assetTableOffset;
      
      for (let i = 0; i < assetTableEntries; i++) {
        const assetId = this.unpackedFileContents.readUInt32BE(currentOffset);
        const reference = this.unpackedFileContents.readUInt32BE(currentOffset + 4);

        this.assetTable.push({
          'assetId': assetId,
          'reference': reference
        });

        currentOffset += 8;
      } 

      resolve();
    });

    Promise.all([schemaPromise, tablePromise, assetTablePromise]).then(() => {
      that.tables.forEach((table, index) => {
        const schema = that.schemaList.getSchema(table.name);

        if (schema) {
          table.schema = schema;
        }
      });

      that.isLoaded = true;
      that.emit('ready');
    }).catch((err) => {
      console.log(err);
      that.emit('error', err);
    });
  };

  save(outputFilePath, options) {
    return this.packFile(outputFilePath, options);
  };

  packFile(outputFilePath, options) {
    const that = this;
    this.emit('saving');

    return new Promise((resolve, reject) => {
      this.unpackedFileContents = this.strategy.file.generateUnpackedContents(this.tables, this.unpackedFileContents);

      let destination = outputFilePath ? outputFilePath : this.filePath;
  
      _packFile(this.unpackedFileContents, options).then((data) => {
        const dataToSave = this.strategy.file.postPackFile(this.packedFileContents, data);

        if (options && options.sync) {
          _saveSync(destination, dataToSave);
          postSaveActions();
        }
        else {
          _save(destination, dataToSave, (err) => {
            postSaveActions(err);
          });
        }

        function postSaveActions(err) {
          if (err) {
            reject(err);
            that.emit('save-error');
          }

          resolve('saved');
          that.emit('saved');
        }
      });
    });
  };

  get rawContents () {
    return this._rawContents;
  };

  get openedFranchiseFile () {
    return this._openedFranchiseFile;
  };

  get filePath () {
    return this._filePath;
  };

  get schema () {
    return this.schemaList;
  };

  get expectedSchemaVersion () {
    return this._expectedSchemaVersion;
  };

  get settings () {
    return this._settings;
  };

  get gameYear () {
    return this._gameYear;
  };

  get type () {
    return this._type;
  };

  set filePath (path) {
    this._filePath = path;
  };

  set settings (settings) {
    this._settings = new FranchiseFileSettings(settings);
  };

  getTableByName (name) {
    return this.tables.find((table) => { return table.name === name; });
  };

  getAllTablesByName (name) {
    return this.tables.filter((table) => { return table.name === name; });
  };

  getTableById (id) {
    return this.tables.find((table) => { return table.header && table.header.tableId === id; });
  };

  getTableByIndex (index) {
    return this.tables[index];
  };

  getReferencedRecord (referenceValue) {
    const reference = utilService.getReferenceData(referenceValue);
    return this.getTableById(reference.tableId).records[reference.rowNumber];
  };

  getReferenceFromAssetId (assetId) {
    const assetEntry = this.assetTable.find((assetEntry) => {
      return assetEntry.assetId === assetId;
    });

    if (assetEntry) {
      const referenceBinaryString = assetEntry.reference.toString(2).padStart(32);
      return utilService.getReferenceData(referenceBinaryString);
    }
    else {
      return null;
    }
  };

  getReferencesToRecord(tableId, recordIndex) {
    const referencedTable = this.getTableById(tableId);

    if (referencedTable) {
      const fullBinary = utilService.getBinaryReferenceData(tableId, recordIndex);
      const hex = utilService.bin2hex(fullBinary).padStart(8, '0');
  
      return this.tables.filter((table) => {
        if (table.schema) {
          return table.schema && table.schema.attributes.find((attribute) => {
            return attribute.type === referencedTable.name;
          });
        }
        else if (table.isArray && referencedTable.schema) {
          // If the referenced table has a schema, we can check its base name.
          // Some array table names are by the base name like EnumTable[] can contain AwardTypeEnumTableEntry

          return table.name.slice(0, table.name.length - 2) === referencedTable.name
            || table.name.slice(0, table.name.length - 2) === referencedTable.schema.base;
        }
        else if (table.isArray) {
          return table.name.slice(0, table.name.length - 2) === referencedTable.name;
        }
      }).filter((table) => {
        return table.data.indexOf(hex, 0, 'hex') !== -1;
      }).map((table) => {
        return {
          tableId: table.header.tableId,
          name: table.name,
          table: table
        }
      });
    }
  };
};

module.exports = FranchiseFile;

function getTableStartOffsetByGameYear(gameYear) {
  switch (gameYear) {
    case 19:
      return 0x90;
    case 20:
    case 21:
    default:
      return 0x94;
  }
};

function unpackFile (data, type) {
  let offset = 0;

  if (type.format === Constants.FORMAT.FRANCHISE) {
    offset = COMPRESSED_DATA_OFFSET;
  }

  return zlib.inflateSync(data.slice(offset));
};

function _packFile (data, options) {
  return new Promise((resolve, reject) => {
    if (options && options.sync) {
      const newData = zlib.deflateSync(data, {
        windowBits: 15
      });
      
      resolve(newData);
    }
    else {
      zlib.deflate(data, {
        windowBits: 15
      }, function (err, newData) {
        if (err) reject(err);
  
        resolve(newData);
      });
    }
  });
};

function _save (destination, packedContents, callback) {
  fs.writeFile(destination, packedContents, callback);
};

function _saveSync (destination, packedContents) {
  fs.writeFileSync(destination, packedContents);
};

function getFileType(data) {
  const isDataCompressed = isCompressed(data);
  const format = getFormat(data, isDataCompressed);
  const year = getGameYear(data, isDataCompressed, format);

  return {
    'format': format,
    'compressed': isDataCompressed,
    'year': year
  };
};

function isCompressed(data) {
  const DECOMPRESSED_HEADER = Buffer.from([0x46, 0x72, 0x54, 0x6B]);  // FrTk

  if (Buffer.compare(data.slice(0, 4), DECOMPRESSED_HEADER) === 0) {
    return false;
  }

  return true;
};

function getFormat(data, isCompressed) {
  if (isCompressed) {
    const ZLIB_HEADER = Buffer.from([0x78, 0x9C]);

    if (Buffer.compare(data.slice(0, 2), ZLIB_HEADER) === 0) {
      return 'franchise-common';
    }
    else {
      return 'franchise';
    }
  }
  else {
    // very simple check based on file length.
    // This assumes the common files are smaller than 9,000 KB.
    if (data.length > 0x895440) {
      return 'franchise';
    }
    else {
      return 'franchise-common';
    }
  }
};

function getGameYear(data, isCompressed, format) {
  const schemaMax = [
    {
      'year': 19,
      'max': 95
    },
    {
      'year': 22,
      'max': 999
    }
  ];

  if(isCompressed) {
    // look at the max schemas per year. M19 schemas will be less than or equal to 95, 
    // while M20 schemas can be anywhere from 96 to 999 because the last schema hasn't been made yet.
    // Once M21 releases, the M20 schema max will be updated with the final number.

    if (format === Constants.FORMAT.FRANCHISE_COMMON) {
      return null;
    }

    // M19 = RL12
    // M20 = M20
    // M21 = M21

    const yearIdentifier = data.slice(0x22, 0x25);

    if (yearIdentifier[0] === 0x52) {
      return 19;
    }
    else if (yearIdentifier[2] === 0x30) {
      return 20;
    }
    else if (yearIdentifier[2] === 0x31) {
      return 21;
    }
    else if (yearIdentifier[2] === 0x32) {
      return 22;
    }
    else {
      const schemaMajor = getCompressedSchema(data).major;
      const year = schemaMax.find((schema) => { return schema.max >= schemaMajor; }).year;
      return year;
    }

  }
  else {
    const schemaMajor = getDecompressedM20Schema(data).major;
    
    if (schemaMajor === 0) {
      // M19 did not include schema info in uncompressed files.
      return 19;
    }
    else {
      // M21 and M20 have very similar formats. We can tell M21 because it has a table with 'M21' in the name.
      if (data.indexOf('M21') > -1) {
        return 21;
      }
      else {
        return null;
      }
    }
  }
};

function getSchemaMetadata(data, type) {
  let schemaMeta = {
    'gameYear': type.year
  };

  if (type.compressed) {
    if (type.format === Constants.FORMAT.FRANCHISE_COMMON) {
      // Compressed FTC files do not contain the schema information.
      // We need to get it later, after we inflate the file.
      return;
    }

    const schemaData = getCompressedSchema(data);
    schemaMeta.major = schemaData.major;
    schemaMeta.minor = schemaData.minor;
  }
  else {
    if (type.year === 19) {
      // M19 did not include schema info in uncompressed files.
      schemaMeta.major = 0;
      schemaMeta.minor = 0;
    }
    else {
      const schemaData = getDecompressedM20Schema(data);
      schemaMeta.major = schemaData.major;
      schemaMeta.minor = schemaData.minor;
    }
  }

  return schemaMeta;
};

function getCompressedSchema(data) {
  return {
    'major': data.readUInt32LE(0x3E),
    'minor': data.readUInt32LE(0x42)
  };
};

function getDecompressedM20Schema(data) {
  return {
    'major': data.readUInt32BE(0x2C),
    'minor': data.readUInt32BE(0x28)
  };
};