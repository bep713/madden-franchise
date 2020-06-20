const sinon = require('sinon');
const proxyquire = require('proxyquire');

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-eventemitter'));

const EventEmitter = require('events').EventEmitter;

let utilService = {
  'replaceAt': sinon.spy(() => { return 'test'; }),
  'binaryBlockToDecimalBlock': sinon.spy(() => { return [25, 30, 60]; })
};

// let unformattedValueSpy = sinon.spy(() => { return '101010101011'; });
// let valueSpy = sinon.spy(() => { return 5; });
// let offsetSpy = sinon.spy(() => { 
//   return {
//   'offset': 0
//   }; 
// });

// let keySpy = sinon.spy(() => { 
//   if (keySpy.callCount === 1) { 
//     return 'PercentageSpline'; 
//   } else {
//     return 'PlayerPosition';
//   }
// });

let listenerFns = [];
let onSpy = sinon.spy((name, fn) => { 
  listenerFns.push(fn);
});

class FranchiseFileField extends EventEmitter {
  constructor(key, value, offset) {
    super();
    this._key = key;
    this._unformattedValue = value;
    this._offset = offset;
  };

  set key (key) {
    this._key = key;
  }

  get key () {
    return this._key;
  }
};

const FranchiseFileRecord = proxyquire('../../FranchiseFileRecord', {
  './services/utilService': utilService,
  './FranchiseFileField': FranchiseFileField
});

let record, data, offsetTable;

describe('FranchiseFileRecord unit tests', () => {
  beforeEach(() => {
    utilService.replaceAt.resetHistory();
    utilService.binaryBlockToDecimalBlock.resetHistory();
    // unformattedValueSpy.resetHistory();
    // valueSpy.resetHistory();
    // offsetSpy.resetHistory();
    // keySpy.resetHistory();
    // onSpy.resetHistory();

    listenerFns = [];

    // Reference - CareerDefensiveStats, record 1
    // The offset table may be inaccurate, but it doesn't matter for these tests.
    // These tests are about ensuring the proper integers are passed to the FranchiseFileFields.
    
    data = Buffer.from([0x28, 0x00, 0x00, 0x00, 0x00, 0x15, 0x08, 0x27, 0x80, 0x00, 0x00, 0x00, 0x00, 0x03, 0xF0, 0x60,
      0x00, 0x28, 0x00, 0x05, 0x02, 0x34, 0xC8, 0x09,0x00, 0x00, 0x01, 0x00]);

    offsetTable = [{
      'offset': 0,
      'length': 3,
      'name': 'STAT_KEEP'
    }, {
      'offset': 3,
      'length': 1,
      'name': 'DLINEHALFSACK'
    }, {
      'offset': 4,
      'length': 13,
      'name': 'DSECINTRETURNYARDS'
    }, {
      'offset': 17,
      'length': 15,
      'name': 'DOWNSPLAYED'
    }, {
      'offset': 32,
      'length': 8,
      'name': 'DSECINTTDS'
    }, {
      'offset': 40,
      'length': 12,
      'name': 'DEFTACKLES'
    }, {
      'offset': 52,
      'length': 12,
      'name': 'DLINEFUMBLERECOVERYYARDS'
    }, {
      'offset': 64,
      'length': 8,
      'name': 'DESCINTLONGESTRETURN'
    }, {
      'offset': 72,
      'length': 12,
      'name': 'BIGHITS'
    }, {
      'offset': 84,
      'length': 12,
      'name': 'CTHALLOWED'
    }, {
      'offset': 96,
      'length': 10,
      'name': 'DEFTACKLESFORLOSS'
    }, {
      'offset': 106,
      'length': 10,
      'name': 'DLINESACKS'
    }, {
      'offset': 116,
      'length': 12,
      'name': 'ASSDEFTACKLES'
    }, {
      'offset': 128,
      'length': 13,
      'name': 'DLINEFUMBLERECOVERIES'
    }, {
      'offset': 141,
      'length': 9,
      'name': 'DESCINTS'
    }, {
      'offset': 150,
      'length': 10,
      'name': 'DEFPASSDEFLECTIONS'
    }, {
      'offset': 160,
      'length': 14,
      'name': 'GAMESPLAYED'
    }, {
      'offset': 174,
      'length': 9,
      'name': 'GAMESSTARTED'
    }, {
      'offset': 183,
      'length': 9,
      'name': 'DLINEFORCEDFUMBLES'
    }, {
      'offset': 192,
      'length': 16,
      'name': 'DLINEBLOCKS'
    }, {
      'offset': 208,
      'length': 8,
      'name': 'DLINEFUMBLETDS'
    }, {
      'offset': 216,
      'length': 8,
      'name': 'DLINESAFETIES'
    }];
  });

  describe('constructor', () => {
    it('sets default values', () => {
      record = new FranchiseFileRecord(data, 0, offsetTable);
      expect(record._data).to.equal(data);
      expect(record._offsetTable).to.eql(offsetTable);
      expect(record.isChanged).to.be.false;
      expect(record.fields).to.not.be.undefined;
      expect(record.index).to.equal(0);
    });

    describe('parses fields correctly', () => {
      it('passes the correct unformatted number to the first field', () => {
        let fieldIndex = 0;

        record = new FranchiseFileRecord(data, 0, offsetTable);
        const field = record.fields[fieldIndex];
  
        expect(field._key).to.eql(offsetTable[fieldIndex].name);
        expect(field._offset).to.eql(offsetTable[fieldIndex]);
        expect(field._unformattedValue).to.eql(1);
      });

      it('parses the second field', () => {
        let fieldIndex = 1;

        record = new FranchiseFileRecord(data, 0, offsetTable);
        const field = record.fields[fieldIndex];
  
        expect(field._key).to.eql(offsetTable[fieldIndex].name);
        expect(field._offset).to.eql(offsetTable[fieldIndex]);
        expect(field._unformattedValue).to.eql(0);
      });

      it('parses the third field', () => {
        let fieldIndex = 2;

        record = new FranchiseFileRecord(data, 0, offsetTable);
        const field = record.fields[fieldIndex];
  
        expect(field._key).to.eql(offsetTable[fieldIndex].name);
        expect(field._offset).to.eql(offsetTable[fieldIndex]);
        expect(field._unformattedValue).to.eql(4096);
      });

      it('parses the fourth field', () => {
        let fieldIndex = 3;

        record = new FranchiseFileRecord(data, 0, offsetTable);
        const field = record.fields[fieldIndex];
  
        expect(field._key).to.eql(offsetTable[fieldIndex].name);
        expect(field._offset).to.eql(offsetTable[fieldIndex]);
        expect(field._unformattedValue).to.eql(0);
      });

      it('parses the fifth field', () => {
        let fieldIndex = 4;

        record = new FranchiseFileRecord(data, 0, offsetTable);
        const field = record.fields[fieldIndex];
  
        expect(field._key).to.eql(offsetTable[fieldIndex].name);
        expect(field._offset).to.eql(offsetTable[fieldIndex]);
        expect(field._unformattedValue).to.eql(0);
      });

      it('parses the sixth field', () => {
        let fieldIndex = 5;

        record = new FranchiseFileRecord(data, 0, offsetTable);
        const field = record.fields[fieldIndex];
  
        expect(field._key).to.eql(offsetTable[fieldIndex].name);
        expect(field._offset).to.eql(offsetTable[fieldIndex]);
        expect(field._unformattedValue).to.eql(336);
      });

      it('parses the seventh field', () => {
        let fieldIndex = 6;

        record = new FranchiseFileRecord(data, 0, offsetTable);
        const field = record.fields[fieldIndex];
  
        expect(field._key).to.eql(offsetTable[fieldIndex].name);
        expect(field._offset).to.eql(offsetTable[fieldIndex]);
        expect(field._unformattedValue).to.eql(2087);
      });

      it('parses the thirteenth field', () => {
        let fieldIndex = 12;

        record = new FranchiseFileRecord(data, 0, offsetTable);
        const field = record.fields[fieldIndex];
  
        expect(field._key).to.eql(offsetTable[fieldIndex].name);
        expect(field._offset).to.eql(offsetTable[fieldIndex]);
        expect(field._unformattedValue).to.eql(96);
      });

      it('parses the last field', () => {
        let fieldIndex = 21;

        record = new FranchiseFileRecord(data, 0, offsetTable);
        const field = record.fields[fieldIndex];
  
        expect(field._key).to.eql(offsetTable[fieldIndex].name);
        expect(field._offset).to.eql(offsetTable[fieldIndex]);
        expect(field._unformattedValue).to.eql(0);
      });
    });


  //   it('dynamically adds the fields as methods on the object', () => {
  //     record = new FranchiseFileRecord(data, 0, offsetTable);
  //     expect(record.PercentageSpline).to.equal('00111000010011100000000000000000');
  //     expect(record.PlayerPosition).to.equal('00000000000000000000000000010000');
  //   });

  //   it('allows setting the field value from the object methods', () => {
  //     record = new FranchiseFileRecord(data, 0, offsetTable);
  //     record.PercentageSpline = 'test';

  //     expect(record.fields[0].value).to.equal('test');
  //   });

  //   it('sets listener for field change', () => {
  //     record = new FranchiseFileRecord(data, 0, offsetTable);

  //     expect(() => {
  //       record.fields[0].emit('change');
  //     }).to.emitFrom(record, 'change');

  //     expect(utilService.replaceAt.callCount).to.equal(1);
  //     expect(utilService.replaceAt.firstCall.args).to.eql([data, offsetTable[0].offset, '101010101']);
  //   });

  //   // it('sets listener for table2-change', () => {
  //   //   record = new FranchiseFileRecord(data, 0, offsetTable);

  //   //   expect(() => {
  //   //     record.fields[0].emit('table2-change');
  //   //   }).to.emitFrom(record, 'table2-change');
  //   // });
  // });

  // describe('hexData', () => {
  //   it('returns a Buffer representation of the data', () => {
  //     record = new FranchiseFileRecord(data, 0, offsetTable);
  //     const result = record.hexData;

  //     expect(utilService.binaryBlockToDecimalBlock.firstCall.args).to.eql([data]);
  //     expect(result).to.eql(Buffer.from(utilService.binaryBlockToDecimalBlock()));
  //   });
  // });

  // describe('getFieldByKey', () => {
  //   it('returns the field that matches the passed in key', () => {
  //     record = new FranchiseFileRecord(data, 0, offsetTable);
  //     const percentageSpline = record.getFieldByKey('PercentageSpline');
  //     expect(percentageSpline).to.not.be.undefined;
  //     expect(percentageSpline.key).to.equal('PercentageSpline');
  //   });

  //   it('returns undefined if field doesnt exist', () => {
  //     record = new FranchiseFileRecord(data, 0, offsetTable);
  //     const shouldBeNull = record.getFieldByKey('Test');
  //     expect(shouldBeNull).to.be.undefined;
  //   });
  // });

  // describe('getValueByKey', () => {
  //   it('returns the matching fields value', () => {
  //     record = new FranchiseFileRecord(data, 0, offsetTable);
  //     const percentageSpline = record.getValueByKey('PercentageSpline');
  //     expect(percentageSpline).to.equal('00111000010011100000000000000000');
  //   });

  //   it('returns undefined if the field wasnt matched', () => {
  //     record = new FranchiseFileRecord(data, 0, offsetTable);
  //     const percentageSpline = record.getValueByKey('Test');
  //     expect(percentageSpline).to.be.null;
  //   });
  });
});