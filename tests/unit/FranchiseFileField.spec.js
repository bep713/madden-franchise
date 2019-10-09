const sinon = require('sinon');
const proxyquire = require('proxyquire');

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-eventemitter'));

let bin2DecResponse = 1;
let bin2FloatResponse = 0.500;
let dec2BinResponse = '1101010101';
let float2BinResponse = '1010101011001';

let utilService = {
  'bin2dec': sinon.spy(() => { return bin2DecResponse; }),
  'bin2Float': sinon.spy(() => { return bin2FloatResponse; }),
  'dec2bin': sinon.spy(() => { return dec2BinResponse; }),
  'float2Bin': sinon.spy(() => { return float2BinResponse; })
};

let valueSpy = sinon.spy(() => { return 'test'; });

let listenerFns = [];
let onSpy = sinon.spy((name, fn) => { 
  listenerFns.push(fn);
});

let FranchiseFileTable2Field = sinon.stub().callsFake(() => {
  return {
    'value': valueSpy(),
    'on': onSpy
  }
});

const FranchiseFileField = proxyquire('../../FranchiseFileField', {
  './services/utilService': utilService,
  './FranchiseFileTable2Field': FranchiseFileTable2Field
});

describe('FranchiseFileField unit tests', () => {
  let field;
  let key = 'test';
  let unformattedValue = '01101011';
  let offset = {
    'type': 'int'
  };

  beforeEach(() => {
    utilService.bin2dec.resetHistory();
    utilService.bin2Float.resetHistory();
    utilService.dec2bin.resetHistory();
    utilService.float2Bin.resetHistory();

    valueSpy.resetHistory();
    onSpy.resetHistory();

    key = 'test';
    unformattedValue = '01101011';
    offset = {
      'type': 'int',
      'length': 5
    };

    listenerFns = [];
  });

  describe('construtor', () => {
    it('sets default values', () => {
      field = new FranchiseFileField(key, unformattedValue, offset);

      expect(field.key).to.equal(key);
      expect(field.unformattedValue).to.equal(unformattedValue);
      expect(field.offset).to.eql(offset);
    });

    it('sets the formatted value', () => {
      field = new FranchiseFileField(key, unformattedValue, offset);
      expect(field.value).to.not.be.null;
    });

    describe('formatted value', () => {
      it('parses int values correctly', () => {
        field = new FranchiseFileField(key, unformattedValue, offset);
        expect(utilService.bin2dec.callCount).to.equal(1);
        expect(utilService.bin2dec.firstCall.args[0]).to.eql(unformattedValue);
        expect(field.value).to.eql(bin2DecResponse);
      });

      it('parses s_ints correctly', () => {
        offset = {
          'type': 's_int',
          'minValue': -2048
        };

        field = new FranchiseFileField(key, unformattedValue, offset);
        expect(utilService.bin2dec.callCount).to.equal(1);
        expect(utilService.bin2dec.firstCall.args[0]).to.eql(unformattedValue);
        expect(field.value).to.eql(bin2DecResponse + offset.minValue);
      });

      it('parses bools correctly - false', () => {
        offset = {
          'type': 'bool'
        };

        unformattedValue = '0';

        field = new FranchiseFileField(key, unformattedValue, offset);
        expect(field.value).to.be.false;
      });

      it('parses bools correctly - true', () => {
        offset = {
          'type': 'bool'
        };

        unformattedValue = '1';

        field = new FranchiseFileField(key, unformattedValue, offset);
        expect(field.value).to.be.true;
      });

      it('parses floats correctly', () => {
        offset = {
          'type': 'float'
        };

        field = new FranchiseFileField(key, unformattedValue, offset);
        expect(utilService.bin2Float.callCount).to.equal(1);
        expect(utilService.bin2Float.firstCall.args[0]).to.eql(unformattedValue);
        expect(field.value).to.eql(bin2FloatResponse);
      });

      it('parses references correctly', () => {
        offset = {
          'type': 'GameStats'
        };

        field = new FranchiseFileField(key, unformattedValue, offset);
        expect(field.value).to.eql(unformattedValue);
      });

      it('parses enums correctly', () => {
        offset = {
          'type': 'ShoeType',
          'enum': {
            'getMemberByUnformattedValue': () => {
              return {
                'name': 'AirJordan'
              };
            }
          }
        };

        field = new FranchiseFileField(key, unformattedValue, offset);
        expect(field.value).to.eql('AirJordan');
      });
    });
  });

  describe('set value field', () => {
    describe('sets value field', () => {
      it('emits change event', () => {
        field = new FranchiseFileField(key, unformattedValue, offset);

        expect(function () {
          field.value = '5';
        }).to.emitFrom(field, 'change');
      });

      it('parses int values correctly', () => {
        field = new FranchiseFileField(key, unformattedValue, offset);
        field.value = '5';
        expect(field.value).to.eql(5);
      });

      it('parses s_ints correctly', () => {
        offset = {
          'type': 's_int',
          'minValue': -2048
        };

        field = new FranchiseFileField(key, unformattedValue, offset);
        field.value = -5;

        expect(field.value).to.eql(-5);
      });

      it('parses bools correctly - false', () => {
        offset = {
          'type': 'bool'
        };

        unformattedValue = '0';

        field = new FranchiseFileField(key, unformattedValue, offset);
        field.value = 'false';
        expect(field.value).to.be.false;

        field.value = 0;
        expect(field.value).to.be.false;

        field.value = false;
        expect(field.value).to.be.false;
      });

      it('parses bools correctly - true', () => {
        offset = {
          'type': 'bool'
        };

        unformattedValue = '1';

        field = new FranchiseFileField(key, unformattedValue, offset);
        field.value = 'true';
        expect(field.value).to.be.true;

        field.value = 1;
        expect(field.value).to.be.true;

        field.value = true;
        expect(field.value).to.be.true;
      });

      it('parses floats correctly', () => {
        offset = {
          'type': 'float'
        };

        field = new FranchiseFileField(key, unformattedValue, offset);
        field.value = 0.593835935;

        expect(field.value).to.eql(0.593835935);
      });

      it('parses references correctly', () => {
        offset = {
          'type': 'GameStats'
        };

        field = new FranchiseFileField(key, unformattedValue, offset);
        field.value = '010101010101011';
        expect(field.value).to.eql('010101010101011');
      });

      it('parses enums correctly - valid enum value (set by value)', () => {
        offset = {
          'type': 'ShoeType',
          'enum': {
            'getMemberByUnformattedValue': () => {
              return {
                'name': 'AirJordan'
              };
            },
            'getMemberByName': () => {
              return null;
            },
            'getMemberByValue': () => {
              return {
                'name': 'AirJordan',
                'value': 0,
                'unformattedValue': '010101'
              };
            },
            'members': [{
              'name': 'Nike'
            }, {
              'name': 'AirJordan'
            }]
          }
        };

        field = new FranchiseFileField(key, unformattedValue, offset);
        field.value = 0;
        expect(field.value).to.eql('AirJordan');
      });

      it('parses enums correctly - valid enum value (set by name)', () => {
        offset = {
          'type': 'ShoeType',
          'enum': {
            'getMemberByUnformattedValue': () => {
              return {
                'name': 'AirJordan'
              };
            },
            'getMemberByName': () => {
              return {
                'name': 'AirJordan',
                'unformattedValue': '010101'
              };
            },
            'getMemberByValue': () => {
              return null;
            },
            'members': [{
              'name': 'Nike'
            }, {
              'name': 'AirJordan'
            }]
          }
        };

        field = new FranchiseFileField(key, unformattedValue, offset);
        field.value = 'AirJordan';
        expect(field.value).to.eql('AirJordan');
      });

      it('parses enums correctly - incorrect enum value', () => {
        offset = {
          'type': 'ShoeType',
          'enum': {
            'getMemberByUnformattedValue': () => {
              return {
                'name': 'AirJordan'
              };
            },
            'getMemberByName': () => {
              return null;
            },
            'getMemberByValue': () => {
              return null;
            },
            'members': [{
              'name': 'AirJordan'
            }, {
              'name': 'Nike'
            }]
          }
        };

        field = new FranchiseFileField(key, unformattedValue, offset);
        let errorFn = () => { field.value = 'Test'; };
        expect(errorFn).to.throw(Error);
      });
    });

    describe('sets unformatted value', () => {
      it('parses int values correctly', () => {
        field = new FranchiseFileField(key, unformattedValue, offset);
        field.value = '7';

        expect(utilService.dec2bin.callCount).to.equal(1);
        expect(utilService.dec2bin.firstCall.args).to.eql(['7', 5]);
        expect(field.unformattedValue).to.eql(dec2BinResponse);
      });
  
      it('parses s_ints correctly', () => {
        offset = {
          'type': 's_int',
          'minValue': -2048,
          'length': 8
        };
  
        field = new FranchiseFileField(key, unformattedValue, offset);
        field.value = -5;
  
        expect(utilService.dec2bin.callCount).to.equal(1);
        expect(utilService.dec2bin.firstCall.args).to.eql([-5 + 2048, 8]);
        expect(field.unformattedValue).to.eql(dec2BinResponse);
      });
  
      it('parses bools correctly - false', () => {
        offset = {
          'type': 'bool'
        };
  
        unformattedValue = '0';
  
        field = new FranchiseFileField(key, unformattedValue, offset);
        field.value = 'false';
        expect(field.unformattedValue).to.equal('0');
  
        field.value = 0;
        expect(field.unformattedValue).to.equal('0');
  
        field.value = false;
        expect(field.unformattedValue).to.equal('0');
      });
  
      it('parses bools correctly - true', () => {
        offset = {
          'type': 'bool'
        };
  
        unformattedValue = '1';
  
        field = new FranchiseFileField(key, unformattedValue, offset);
        field.value = 'true';
        expect(field.unformattedValue).to.equal('1');
  
        field.value = 1;
        expect(field.unformattedValue).to.equal('1');
  
        field.value = true;
        expect(field.unformattedValue).to.equal('1');
      });
  
      it('parses floats correctly', () => {
        offset = {
          'type': 'float'
        };
  
        field = new FranchiseFileField(key, unformattedValue, offset);
        field.value = 0.593835935;
        
        expect(utilService.float2Bin.callCount).to.equal(1);
        expect(utilService.float2Bin.firstCall.args).to.eql([0.593835935])
        expect(field.unformattedValue).to.eql(float2BinResponse);
      });
  
      it('parses references correctly', () => {
        offset = {
          'type': 'GameStats'
        };
  
        field = new FranchiseFileField(key, unformattedValue, offset);
        field.value = '010101010101011';
        expect(field.unformattedValue).to.eql('010101010101011');
      });
  
      it('parses enums correctly - valid enum value (set by name)', () => {
        offset = {
          'type': 'ShoeType',
          'enum': {
            'getMemberByUnformattedValue': () => {
              return {
                'name': 'AirJordan'
              };
            },
            'getMemberByName': () => {
              return {
                'name': 'AirJordan',
                'unformattedValue': '010101'
              };
            },
            'getMemberByValue': () => {
              return {
                'name': 'AirJordan'
              };
            },
            'members': [{
              'name': 'AirJordan'
            }, {
              'name': 'Nike'
            }]
          }
        };
  
        field = new FranchiseFileField(key, unformattedValue, offset);
        field.value = 'AirJordan';
        expect(field.unformattedValue).to.eql('010101');
      });

      it('parses enums correctly - valid enum value (set by value)', () => {
        offset = {
          'type': 'ShoeType',
          'enum': {
            'getMemberByUnformattedValue': () => {
              return {
                'name': 'AirJordan'
              };
            },
            'getMemberByName': () => {
              return null;
            },
            'getMemberByValue': () => {
              return {
                'name': 'AirJordan',
                'value': 0,
                'unformattedValue': '010101'
              };
            },
            'members': [{
              'name': 'AirJordan'
            }, {
              'name': 'Nike'
            }]
          }
        };
  
        field = new FranchiseFileField(key, unformattedValue, offset);
        field.value = '0';
        expect(field.unformattedValue).to.eql('010101');
      });

      // it('parses enums correctly - valid enum value (set by unformatted value)', () => {
      //   offset = {
      //     'type': 'ShoeType',
      //     'enum': {
      //       'getMemberByUnformattedValue': () => {
      //         return {
      //           'name': 'AirJordan',
      //           'value': 0,
      //           'unformattedValue': '010101'
      //         };
      //       },
      //       'getMemberByName': () => {
      //         return null;
      //       },
      //       'getMemberByValue': () => {
      //         return null;
      //       },
      //       'members': [{
      //         'name': 'AirJordan'
      //       }, {
      //         'name': 'Nike'
      //       }]
      //     }
      //   };
  
      //   field = new FranchiseFileField(key, unformattedValue, offset);
      //   field.value = '010101';
      //   expect(field.unformattedValue).to.eql('010101');
      // });
  
      // it('parses enums correctly - incorrect enum value', () => {
      //   offset = {
      //     'type': 'ShoeType',
      //     'enum': {
      //       'getMemberByUnformattedValue': () => {
      //         return null;
      //       },
      //       'getMemberByName': () => {
      //         return null;
      //       },
      //       'getMemberByValue': () => {
      //         return null;
      //       },
      //       'members': [{
      //         'name': 'AirJordan'
      //       }, {
      //         'name': 'Nike'
      //       }]
      //     }
      //   };
  
      //   field = new FranchiseFileField(key, unformattedValue, offset);
      //   field.value = 'Test';
      //   expect(field.value).to.eql('AirJordan');
      // });
    });
  });

  describe('set unformatted value field', () => {
    it('sets the unformatted value', () => {
      field = new FranchiseFileField(key, unformattedValue, offset);
      field.unformattedValue = '101010101011';

      expect(field.unformattedValue).to.equal('101010101011');
    });

    it('emits a change event', () => {
      field = new FranchiseFileField(key, unformattedValue, offset);

      expect(() => {
        field.unformattedValue = '1010101';
      }).to.emitFrom(field, 'change');
    });

    it('throws an error if the argument isn\'t a string', () => {
      field = new FranchiseFileField(key, unformattedValue, offset);
      expect(() => {
        field.unformattedValue = 2;
      }).to.throw(Error);
    });

    it('throws an error if the string contains anything excepts 1s and 0s', () => {
      field = new FranchiseFileField(key, unformattedValue, offset);
      expect(() => {
        field.unformattedValue = '10101014';
      }).to.throw(Error);
    });

    it('sets the value attribute', () => {
      field = new FranchiseFileField(key, unformattedValue, offset);
      field.unformattedValue = '1010101010';
      expect(utilService.bin2dec.callCount).to.equal(2);
      expect(field.value).to.eql(bin2DecResponse);
    });
  });

  describe('second table scenario', () => {
    beforeEach(() => {
      offset = {
        'type': 'string',
        'maxLength': '10',
        'valueInSecondTable': true
      };

      field = new FranchiseFileField(key, unformattedValue, offset);
    });

    it('creates a second table field', () => {
      expect(field.secondTableField).to.not.be.undefined;
      expect(FranchiseFileTable2Field.callCount).to.equal(1);
      expect(FranchiseFileTable2Field.firstCall.args[0]).to.eql(unformattedValue, offset);
    });

    it('changes field value when second table field changes', () => {
      listenerFns[0]();
      expect(field.value).to.equal('test');
    });

    // it('emits the table2-change event when the second table field changes', () => {      
    //   field = new FranchiseFileField(key, unformattedValue, offset);

    //   expect(() => {
    //     listenerFns[1]();
    //   }).to.emitFrom(field, 'table2-change');
    // });

    it('sets the second table field when .value is set', () => {
      field.value = 'hello';
      expect(field.secondTableField.value).to.equal('hello');
    });

    it('should not set the second table field when .unformattedValue is set', () => {
      // this is because the field's unformatted value will contain a reference to the second table field's offset and we need to keep that.
      field.unformattedValue = '1000010101';
      expect(field.secondTableField.value).to.equal('test');
    })
  });
});