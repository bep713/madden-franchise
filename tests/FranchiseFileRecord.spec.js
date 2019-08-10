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

let unformattedValueSpy = sinon.spy(() => { return '101010101011'; });
let valueSpy = sinon.spy(() => { return 5; });
let offsetSpy = sinon.spy(() => { 
  return {
  'offset': 0
  }; 
});

let keySpy = sinon.spy(() => { 
  if (keySpy.callCount === 1) { 
    return 'PercentageSpline'; 
  } else {
    return 'PlayerPosition';
  }
});

let listenerFns = [];
let onSpy = sinon.spy((name, fn) => { 
  listenerFns.push(fn);
});

class FranchiseFileField extends EventEmitter {
  constructor(name, value, offset) {
    super();
    this._key = name;
    this._value = value;
    this._unformattedValue = '101010101';
    this._offset = offset;
  };

  set key (key) {
    this._key = key;
  }

  get key () {
    return this._key;
  }
};

const FranchiseFileRecord = proxyquire('../FranchiseFileRecord', {
  './services/utilService': utilService,
  './FranchiseFileField': FranchiseFileField
});

let record, data, offsetTable;

describe('FranchiseFileRecord unit tests', () => {
  beforeEach(() => {
    utilService.replaceAt.resetHistory();
    utilService.binaryBlockToDecimalBlock.resetHistory();
    unformattedValueSpy.resetHistory();
    valueSpy.resetHistory();
    offsetSpy.resetHistory();
    keySpy.resetHistory();
    onSpy.resetHistory();

    listenerFns = [];

    data = '0011100001001110000000000000000000000000000000000000000000010000';
    offsetTable = [{
      'offset': 0,
      'length': 32,
      'name': 'PercentageSpline'
    }, {
      'offset': 32,
      'length': 32,
      'name': 'PlayerPosition'
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

    it('parses the fields', () => {
      record = new FranchiseFileRecord(data, 0, offsetTable);
      expect(record.fields.length).to.equal(offsetTable.length);

      const record1 = record.fields[0];
      expect(record1.key).to.equal('PercentageSpline');
      expect(record1.value).to.equal('00111000010011100000000000000000');
      expect(record1.offset).to.eql(offsetTable[0]);

      const record2 = record.fields[1];
      expect(record2.key).to.equal('PlayerPosition');
      expect(record2.value).to.equal('00000000000000000000000000010000');
      expect(record2.offset).to.eql(offsetTable[1]);
    });

    it('dynamically adds the fields as methods on the object', () => {
      record = new FranchiseFileRecord(data, 0, offsetTable);
      expect(record.PercentageSpline).to.equal('00111000010011100000000000000000');
      expect(record.PlayerPosition).to.equal('00000000000000000000000000010000');
    });

    it('allows setting the field value from the object methods', () => {
      record = new FranchiseFileRecord(data, 0, offsetTable);
      record.PercentageSpline = 'test';

      expect(record.fields[0].value).to.equal('test');
    });

    it('sets listener for field change', () => {
      record = new FranchiseFileRecord(data, 0, offsetTable);

      expect(() => {
        record.fields[0].emit('change');
      }).to.emitFrom(record, 'change');

      expect(utilService.replaceAt.callCount).to.equal(1);
      expect(utilService.replaceAt.firstCall.args).to.eql([data, offsetTable[0].offset, '101010101']);
    });

    it('sets listener for table2-change', () => {
      record = new FranchiseFileRecord(data, 0, offsetTable);

      expect(() => {
        record.fields[0].emit('table2-change');
      }).to.emitFrom(record, 'table2-change');
    });
  });

  describe('hexData', () => {
    it('returns a Buffer representation of the data', () => {
      record = new FranchiseFileRecord(data, 0, offsetTable);
      const result = record.hexData;

      expect(utilService.binaryBlockToDecimalBlock.firstCall.args).to.eql([data]);
      expect(result).to.eql(Buffer.from(utilService.binaryBlockToDecimalBlock()));
    });
  });

  describe('getFieldByKey', () => {
    it('returns the field that matches the passed in key', () => {
      record = new FranchiseFileRecord(data, 0, offsetTable);
      const percentageSpline = record.getFieldByKey('PercentageSpline');
      expect(percentageSpline).to.not.be.undefined;
      expect(percentageSpline.key).to.equal('PercentageSpline');
    });

    it('returns undefined if field doesnt exist', () => {
      record = new FranchiseFileRecord(data, 0, offsetTable);
      const shouldBeNull = record.getFieldByKey('Test');
      expect(shouldBeNull).to.be.undefined;
    });
  });

  describe('getValueByKey', () => {
    it('returns the matching fields value', () => {
      record = new FranchiseFileRecord(data, 0, offsetTable);
      const percentageSpline = record.getValueByKey('PercentageSpline');
      expect(percentageSpline).to.equal('00111000010011100000000000000000');
    });

    it('returns undefined if the field wasnt matched', () => {
      record = new FranchiseFileRecord(data, 0, offsetTable);
      const percentageSpline = record.getValueByKey('Test');
      expect(percentageSpline).to.be.null;
    });
  });
});