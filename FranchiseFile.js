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
        const nextTable = tableIndicies.length >= i+1 ? tableIndicies[i+1] : null;

        const tableData = this.unpackedFileContents.subarray(currentTable, nextTable);

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

    Promise.all([schemaPromise, tablePromise]).then(() => {
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

  save(outputFilePath) {
    return this.packFile(outputFilePath);
  };

  packFile(outputFilePath) {
    const that = this;
    this.emit('saving');

    return new Promise((resolve, reject) => {
      this.unpackedFileContents = this.strategy.file.generateUnpackedContents(this.tables, this.unpackedFileContents);
      // const changedTables = this.tables.filter((table) => { return table.isChanged; });
  
      //   for (let i = 0; i < changedTables.length; i++) {
      //     let table = changedTables[i];
      //     const header = that.unpackedFileContents.slice(0, table.offset);
      //     const trailer = that.unpackedFileContents.slice(table.offset + table.data.length);
      //     that.unpackedFileContents = Buffer.concat([header, table.hexData, trailer]);

      //     table.isChanged = false;
      //   }

      let destination = outputFilePath ? outputFilePath : this.filePath;
  
      _packFile(this.unpackedFileContents).then((data) => {
        const dataToSave = this.strategy.file.postPackFile(this.packedFileContents, data);
        _save(destination, dataToSave, (err) => {
          if (err) {
            reject(err);
            that.emit('save-error');
          }
          resolve('saved');
          that.emit('saved');
        });
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
};

module.exports = FranchiseFile;

function getTableStartOffsetByGameYear(gameYear) {
  switch (gameYear) {
    case 20:
      return 0x94;
    case 19:
    default:
      return 0x90;
  }
};

function unpackFile (data, type) {
  let offset = 0;

  if (type.format === Constants.FORMAT.FRANCHISE) {
    offset = COMPRESSED_DATA_OFFSET;
  }

  return zlib.inflateSync(data.slice(offset));
};

function _packFile (data) {
  return new Promise((resolve, reject) => {
    zlib.deflate(data, {
      windowBits: 15
    }, function (err, newData) {
      if (err) reject(err);

      resolve(newData);
    });
  });
};

function _save (destination, packedContents, callback) {
  fs.writeFile(destination, packedContents, callback);
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
      'year': 20,
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

    const schemaMajor = getCompressedSchema(data).major;
    const year = schemaMax.find((schema) => { return schema.max >= schemaMajor; }).year;
    return year;
  }
  else {
    const schemaMajor = getDecompressedM20Schema(data).major;
    
    if (schemaMajor === 0) {
      // M19 did not include schema info in uncompressed files.
      return 19;
    }
    else {
      return 20;
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
    if (type.year === 20) {
      const schemaData = getDecompressedM20Schema(data);
      schemaMeta.major = schemaData.major;
      schemaMeta.minor = schemaData.minor;
    }
    else {
      // M19 did not include schema info in uncompressed files.
      schemaMeta.major = 0;
      schemaMeta.minor = 0;
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