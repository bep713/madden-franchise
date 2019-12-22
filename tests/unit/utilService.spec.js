const expect = require('chai').expect;
const utilService = require('../../services/utilService');

describe('util service unit tests', () => {
  describe('dec2bin', () => {
    it('converts a number to a binary string', () => {
      expect(utilService.dec2bin(5)).to.equal('101');
    });

    it('will pad the string with leading zeroes if length arument is longer than result', () => {
      expect(utilService.dec2bin(5, 10)).to.equal('0000000101');
    });

    it('can handle a string input', () => {
      expect(utilService.dec2bin('5')).to.equal('101');
    });

    it('can handle negative numbers', () => {
      expect(utilService.dec2bin(-5)).to.equal('11111111111111111111111111111011');
    });
  });

  describe('bin2dec', () => {
    it('converts a binary string into a number', () => {
      expect(utilService.bin2dec('101')).to.equal(5);
    });

    checkArgumentType(utilService.bin2dec);
  });

  describe('bin2Float', () => {
    it('converts a binary string into a float', () => {
      expect(utilService.bin2Float('00111110100000101000111101011100')).to.equal(0.2549999952316284);
    });

    checkArgumentType(utilService.bin2Float);
  });

  describe('float2Bin', () => {
    it('converts a float to a binary string and will pad result to 32 bits', () => {
      expect(utilService.float2Bin(0.2549999952316284)).to.equal('00111110100000101000111101011100');
    });
  });

  describe('replaceAt', () => {
    it('replaces values in the middle of a string', () => {
      let result = utilService.replaceAt('test', 1, 'a');
      expect(result).to.equal('tast');
    });

    it('replaces an entire string if the offset = string length', () => {
      let result = utilService.replaceAt('test', 0, 'here');
      expect(result).to.equal('here');
    });

    it('adds on to the string if the new value is larger than original', () => {
      let result = utilService.replaceAt('test', 3, 'hello');
      expect(result).to.equal('teshello');
    });

    it('adds on to the string without any space if the offset is larger than the original', () => {
      let result = utilService.replaceAt('test', 4, 'hello');
      expect(result).to.equal('testhello');
    });

    it('throws an error if given a negative offset', () => {
      let errorFn = () => { utilService.replaceAt('test', -1, 'hello'); };
      expect(errorFn).to.throw(Error);
    });
  });

  describe('parse reference information', () => {
    it ('returns expected result', () => {
      let result = utilService.getReferenceData('00111101110001000000000000001011');
      expect(result).to.eql({
        'tableId': 7906,
        'rowNumber': 11
      });
    });
  });
});

function checkArgumentType(fn) {
  it('throws an error if anything except a string is passed', () => {
    expect(() => {
      fn(5);
    }).to.throw(Error);
  });
  it('throws an error if the text isn\'t binary', () => {
    expect(() => {
      fn('230304');
    }).to.throw(Error);
  });
}
