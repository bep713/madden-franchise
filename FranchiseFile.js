const fs = require('fs');
const zlib = require('zlib');
const EventEmitter = require('events').EventEmitter;
const FranchiseSchema = require('./FranchiseSchema');
const FranchiseFileTable = require('./FranchiseFileTable');
const FranchiseFileSettings = require('./FranchiseFileSettings');

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
    this._gameYear = getMaddenYear(this._rawContents);
    // console.log('This was saved in Madden', this._gameYear);

    if (this._rawContents.length === COMPRESSED_FILE_LENGTH) {
      this._openedFranchiseFile = true;
      this.packedFileContents = this.rawContents;
      this.unpackedFileContents = unpackFile(this.rawContents);
      // fs.writeFileSync(filePath.substring(0, filePath.lastIndexOf('\\')) + '\\M20unpack.frt', this.unpackedFileContents);
    } else {
      this._openedFranchiseFile = false;
      this.unpackedFileContents = this.rawContents;
    }

    this.parse();
  };

  parse() {
    const that = this;

    // if (this._gameYear === 19) {
    //   this.schedule = new FranchiseSchedule(this.unpackedFileContents);

    //   this.schedule.on('change', function (game) {
    //     const header = that.unpackedFileContents.slice(0, game.offset);
    //     const trailer = that.unpackedFileContents.slice(game.offset + game.hexData.length);

    //     that.unpackedFileContents = Buffer.concat([header, game.hexData, trailer]);
    //     that.packFile();
    //   });

    //   this.schedule.on('change-all', function (offsets) {
    //     const header = that.unpackedFileContents.slice(0, offsets.startingOffset);
    //     const trailer = that.unpackedFileContents.slice(offsets.endingOffset);

    //     that.unpackedFileContents = Buffer.concat([header, offsets.hexData, trailer]);
    //     that.packFile();
    //   });
    // }

    let schemaPromise = new Promise((resolve, reject) => {
      this.schemaList = new FranchiseSchema(this._gameYear);
      // this.schemaList.on('schemas:done', function () {
        resolve();
      // });
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

      const tableIndicies = [];

      for (let i = 0; i <= this.unpackedFileContents.length - 4; i+=1) {
        if ((this.unpackedFileContents[i] === firstCheck
          && this.unpackedFileContents[i+1] === secondCheck
          && this.unpackedFileContents[i+2] === thirdCheck
          && this.unpackedFileContents[i+3] === fourthCheck) ||
          (this.unpackedFileContents[i] === altFirstCheck
          && this.unpackedFileContents[i+1] === altSecondCheck
          && this.unpackedFileContents[i+2] === altThirdCheck
          && this.unpackedFileContents[i+3] === altFourthCheck)) {
            const tableStart = i - getTableStartOffsetByGameYear(this._gameYear);
            tableIndicies.push(tableStart);
          }
      }

      this.tables = [];

      for (let i = 0; i < tableIndicies.length; i++) {
        const currentTable = tableIndicies[i];
        const nextTable = tableIndicies.length >= i+1 ? tableIndicies[i+1] : null;

        const tableData = this.unpackedFileContents.slice(currentTable, nextTable);

        const newFranchiseTable = new FranchiseFileTable(tableData, currentTable, this._gameYear);
        this.tables.push(newFranchiseTable);

        newFranchiseTable.on('change', function () {
          if (that.settings.saveOnChange) {
            const header = that.unpackedFileContents.slice(0, this.offset);
            const trailer = that.unpackedFileContents.slice(this.offset + this.data.length);

            that.unpackedFileContents = Buffer.concat([header, this.hexData, trailer]);
            this.isChanged = false;

            that.packFile();
          } else {
            this.isChanged = true;
          }
          
          that.emit('change', newFranchiseTable);
        });
      }

      resolve();
    });

    Promise.all([schemaPromise, tablePromise]).then(() => {
      that.tables.forEach((table) => {
        // console.log(table.name);
        const schema = that.schemaList.getSchema(table.name);

        if (schema) {
          table.schema = that.schemaList.getSchema(table.name);
        }
      });

      that.isLoaded = true;
      that.emit('ready');
    });
  };

  save(outputFilePath) {
    return this.packFile(outputFilePath);
  };

  packFile(outputFilePath) {
    const that = this;
    this.emit('saving');

    return new Promise((resolve, reject) => {
      if (!this.settings.saveOnChange) {
        const changedTables = this.tables.filter((table) => { return table.isChanged; });
  
        for (let i = 0; i < changedTables.length; i++) {
          let table = changedTables[i];
          const header = that.unpackedFileContents.slice(0, table.offset);
          const trailer = that.unpackedFileContents.slice(table.offset + table.data.length);
          that.unpackedFileContents = Buffer.concat([header, table.hexData, trailer]);

          table.isChanged = false;
        }
      }
  
      let destination = outputFilePath ? outputFilePath : this.filePath;
  
      if (this.openedFranchiseFile) {
        _packFile(this.packedFileContents, this.unpackedFileContents).then((data) => { 
          _save(destination, data, (err) => {
            if (err) {
              reject(err);
              that.emit('save-error');
            }
            resolve('saved');
            that.emit('saved');
          });
        });
      }
      else {
        reject('no file path')
        // ask where to save file
      }
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

  get settings () {
    return this._settings;
  };

  get gameYear () {
    return this._gameYear;
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

function unpackFile (fileData) {
  return zlib.inflateSync(fileData.slice(COMPRESSED_DATA_OFFSET));
};

function _packFile (originalData, data) {
  return new Promise((resolve, reject) => {
    zlib.deflate(data, {
      windowBits: 15
    }, function (err, newData) {
      if (err) reject(err);

      const header = originalData.slice(0, COMPRESSED_DATA_OFFSET);
      const endOfData = (newData.length).toString(16);
      header[0x4A] = parseInt(endOfData.substr(4), 16);
      header[0x4B] = parseInt(endOfData.substr(2, 2), 16);
      header[0x4C] = parseInt(endOfData.substr(0, 2), 16);
    
      const trailer = originalData.slice(newData.length + COMPRESSED_DATA_OFFSET);
      resolve(Buffer.concat([header, newData, trailer]));
    });
  });
};

function _save (destination, packedContents, callback) {
  fs.writeFile(destination, packedContents, callback);
};

function getMaddenYear(compressedData) {
  if (compressedData.length < 0x24) {
    return null;
  }


  // Madden 20 saves will have 'M20' at this location in the compressed file
  if (compressedData[0x22] === 77 && compressedData[0x23] === 50 && compressedData[0x24] === 48) {
    return 20;
  }

  if (compressedData[0x0B]) {
    return 20;
  }

  return 19;
};