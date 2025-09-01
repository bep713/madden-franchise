import sinon from 'sinon';
import { expect } from 'chai';
import { EventEmitter } from 'events';
import quibble from 'quibble';

let utilServiceMock = {
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

class FranchiseFileFieldMock extends EventEmitter {
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

  set value(val) {
    this._value = val;
  }

  get value() {
    return this._value;
  }

  get offset() {
    return this._offset;
  }
};

let record, data, offsetTable;

describe('FranchiseFileRecord unit tests', () => {
  let FranchiseFileRecord;

  beforeEach(async () => {
    utilServiceMock.replaceAt.resetHistory();
    utilServiceMock.binaryBlockToDecimalBlock.resetHistory();
    unformattedValueSpy.resetHistory();
    valueSpy.resetHistory();
    offsetSpy.resetHistory();
    keySpy.resetHistory();
    onSpy.resetHistory();

    listenerFns = [];

    data = Buffer.from([0x36, 0xD4, 0x00, 0x00, 0x00, 0x00, 0x00, 0x10]);
    offsetTable = [{
      'offset': 0,
      'length': 32,
      'name': 'PercentageSpline'
    }, {
      'offset': 32,
      'length': 32,
      'name': 'PlayerPosition'
    }];

    await quibble.esm('../../src/services/utilService.js', {}, utilServiceMock);
    await quibble.esm('../../src/FranchiseFileField.js', {}, FranchiseFileFieldMock);
    FranchiseFileRecord = (await import('../../src/FranchiseFileRecord.js')).default;
  });

  afterEach(() => {
      quibble.reset();
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
      expect(record.fieldsArray.length).to.equal(offsetTable.length);

      const field1 = record.fieldsArray[0];
      expect(field1.key).to.equal('PercentageSpline');

      // We are mocking the FranchiseFileField, so the value just equals the entire block of data.
      expect(field1.value).to.eql(data);
      expect(field1.offset).to.eql(offsetTable[0]);

      const field2 = record.fieldsArray[1];
      expect(field2.key).to.equal('PlayerPosition');
      expect(field2.value).to.eql(data);
      expect(field2.offset).to.eql(offsetTable[1]);
    });

    it('dynamically adds the fields as methods on the object', () => {
      record = new FranchiseFileRecord(data, 0, offsetTable);

      // Again, we are stubbing the FranchiseFileField, so value will equal the entire buffer.
      expect(record.PercentageSpline).to.eql(data);
      expect(record.PlayerPosition).to.eql(data);
    });

    it('allows setting the field value from the object methods', () => {
      record = new FranchiseFileRecord(data, 0, offsetTable);
      record.PercentageSpline = 'test';

      expect(record.fields['PercentageSpline'].value).to.equal('test');
      expect(record.PercentageSpline).to.equal('test');
      expect(record.fieldsArray[0].value).to.equal('test');
    });
  });

  describe('hexData', () => {
    it('returns a Buffer representation of the data', () => {
      record = new FranchiseFileRecord(data, 0, offsetTable);
      const result = record.hexData;
      expect(result).to.eql(data);
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

      // Again, we are stubbing FranchiseFileField so the value is the entire data buffer.
      expect(percentageSpline).to.eql(data);
    });

    it('returns undefined if the field wasnt matched', () => {
      record = new FranchiseFileRecord(data, 0, offsetTable);
      const percentageSpline = record.getValueByKey('Test');
      expect(percentageSpline).to.be.null;
    });
  });
});