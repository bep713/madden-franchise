const sinon = require('sinon');
const proxyquire = require('proxyquire');

const chai = require('chai');
const { BitView } = require('bit-buffer');
const expect = chai.expect;

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
  // './services/utilService': utilService,
  './FranchiseFileTable2Field': FranchiseFileTable2Field
});

describe('FranchiseFileField unit tests', () => {
  let field;
  let key = 'test';
  let unformattedValue = Buffer.from([0x6B]);
  let offset = {
    'type': 'int'
  };

  let parent = {
    onEvent: sinon.spy(() => {})
  };

  beforeEach(() => {
    utilService.bin2dec.resetHistory();
    utilService.bin2Float.resetHistory();
    utilService.dec2bin.resetHistory();
    utilService.float2Bin.resetHistory();

    valueSpy.resetHistory();
    onSpy.resetHistory();

    key = 'test';
    unformattedValue = Buffer.from([0x6B]);
    offset = {
      'type': 'int',
      'offset': 0,
      'length': 5,
      'minValue': 0,
      'maxValue': 15
    };

    parent.onEvent.resetHistory();

    listenerFns = [];
  });

  describe('construtor', () => {
    it('sets default values', () => {
      field = new FranchiseFileField(key, unformattedValue, offset);

      expect(field.key).to.equal(key);
      expect(field.unformattedValue).to.be.an.instanceOf(BitView)
      expect(field.offset).to.eql(offset);
    });

    it('sets the formatted value', () => {
      field = new FranchiseFileField(key, unformattedValue, offset);
      expect(field.value).to.not.be.null;
    });

    describe('formatted value', () => {
      it('parses int values correctly', () => {
        field = new FranchiseFileField(key, unformattedValue, offset);
        expect(field.value).to.eql(13);
      });

      // describe('parses int values without a max/min correctly', () => {
      //   // it('parses int values without a max/min correctly', () => {
      //   //   let offset2 = {
      //   //     'type': 'int',
      //   //     'length': 5,
      //   //     'offset': 0
      //   //   };
  
      //   //   field = new FranchiseFileField(key, unformattedValue, offset2);
      //   //   expect(field.value).to.equal(13);
      //   // });
  
      //   it('parses int values of 0 correctly', () => {
      //     let offset2 = {
      //       'type': 'int',
      //       'length': 32
      //     };
  
      //     field = new FranchiseFileField(key, '000000000000000000000000000000000', offset2);

      //     utilService.bin2dec = sinon.spy(() => { return bin2DecResponse; });
  
      //     // bin2dec is stubbed out to always return 1. if you look
      //     // inside the method here, it would do 1-1 which equals 0.
      //     expect(field.value).to.equal(0);
      //   });
      // });


      it('parses s_ints correctly', () => {
        offset = {
          'type': 's_int',
          'length': 5,
          'offset': 0,
          'minValue': -2048
        };

        field = new FranchiseFileField(key, unformattedValue, offset);
        expect(field.value).to.eql(-2035);
      });

      it('parses bools correctly - false', () => {
        offset = {
          'type': 'bool',
          'length': 1,
          'offset': 0,
        };

        unformattedValue = Buffer.from([0x00]);

        field = new FranchiseFileField(key, unformattedValue, offset);
        expect(field.value).to.be.false;
      });

      it('parses bools correctly - true', () => {
        offset = {
          'type': 'bool',
          'length': 1,
          'offset': 7,
        };

        unformattedValue = Buffer.from([0x01]);

        field = new FranchiseFileField(key, unformattedValue, offset);
        expect(field.value).to.be.true;
      });

      it('parses floats correctly', () => {
        offset = {
          'type': 'float',
          'length': 32,
          'offset': 0
        };

        field = new FranchiseFileField(key, Buffer.from([0x3E, 0x8C, 0xCC, 0xCD]), offset);
        expect(field.value.toFixed(3)).to.eql('0.275');
      });

      it('parses references correctly', () => {
        offset = {
          'type': 'GameStats',
          'isReference': true,
          'length': 32,
          'offset': 0
        };

        field = new FranchiseFileField(key, Buffer.from([0x36, 0xD4, 0x00, 0x01]), offset);
        expect(field.value).to.eql('00110110110101000000000000000001');
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

      it('can get a value as if it were another type - int', () => {
        offset = {
          'type': 'GameStats',
          'isReference': true,
          'length': 32,
          'offset': 0
        };

        field = new FranchiseFileField(key, Buffer.from([0x36, 0xD4, 0x00, 0x01]), offset);

        let newOffset = {
          ...offset,
          'type': 'int',
          'minValue': 1,
          'isReference': false,
        };

        expect(field.getValueAs(newOffset)).to.equal(919863297);
      })

      it('can get a value as if it were another type - ref', () => {
        offset = {
          'type': 'int',
          'minValue': 1,
          'isReference': false,
          'length': 32,
          'offset': 0
        };

        field = new FranchiseFileField(key, Buffer.from([0x36, 0xD4, 0x00, 0x01]), offset);

        let newOffset = {
          ...offset,
          'type': 'Ref',
          'minValue': 1,
          'isReference': true,
        };

        expect(field.getValueAs(newOffset)).to.equal('00110110110101000000000000000001');
      })
    });
  });

  describe('set value field', () => {
    describe('sets value field', () => {
      it('emits change event', () => {
        field = new FranchiseFileField(key, unformattedValue, offset, parent);
        field.value = '4';
        expect(parent.onEvent.callCount).to.equal(1);
      });

      it('parses int values correctly', () => {
        field = new FranchiseFileField(key, unformattedValue, offset, parent);
        field.value = '5';
        expect(field.value).to.eql(5);
      });

      it('parses s_ints correctly', () => {
        offset = {
          'type': 's_int',
          'minValue': -2048
        };

        field = new FranchiseFileField(key, unformattedValue, offset, parent);
        field.value = -5;

        expect(field.value).to.eql(-5);
      });

      it('parses bools correctly - false', () => {
        offset = {
          'type': 'bool',
          'length': 1,
          'offset': 7
        };

        unformattedValue = Buffer.from([0x00]);

        field = new FranchiseFileField(key, unformattedValue, offset, parent);
        field.value = 'false';
        expect(field.value).to.be.false;

        field.value = 0;
        expect(field.value).to.be.false;

        field.value = false;
        expect(field.value).to.be.false;
      });

      it('parses bools correctly - true', () => {
        offset = {
          'type': 'bool',
          'length': 1,
          'offset': 7
        };

        unformattedValue = Buffer.from([0x01]);

        field = new FranchiseFileField(key, unformattedValue, offset, parent);
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

        field = new FranchiseFileField(key, unformattedValue, offset, parent);
        field.value = 0.593835935;

        expect(field.value).to.eql(0.593835935);
      });

      it('parses references correctly', () => {
        offset = {
          'type': 'GameStats',
          'isReference': true,
          'length': 32,
          'offset': 0
        };

        field = new FranchiseFileField(key, Buffer.from([0x36, 0xD4, 0x00, 0x00]), offset, parent);
        field.value = '00110110110101000000000000000000';
        expect(field.value).to.eql('00110110110101000000000000000000');
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

        field = new FranchiseFileField(key, unformattedValue, offset, parent);
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

        field = new FranchiseFileField(key, unformattedValue, offset, parent);
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

        field = new FranchiseFileField(key, unformattedValue, offset, parent);
        let errorFn = () => { field.value = 'Test'; };
        expect(errorFn).to.throw(Error);
      });
    });

    describe('sets unformatted value', () => {
      it('parses int values correctly', () => {
        field = new FranchiseFileField(key, unformattedValue, offset, parent);
        field.value = '7';
        expect(unformattedValue).to.eql(Buffer.from([0x3B]));
      });
  
      it('parses s_ints correctly', () => {
        offset = {
          'type': 's_int',
          'minValue': -2048,
          'offset': 0,
          'length': 32
        };

        unformattedValue = Buffer.from([0x00, 0x00, 0x00, 0x6B]); 
        field = new FranchiseFileField(key, unformattedValue, offset, parent);
        field.value = -5;
  
        expect(unformattedValue).to.eql(Buffer.from([0x00, 0x00, 0x07, 0xFB]));
      });
  
      it('parses bools correctly - false', () => {
        offset = {
          'type': 'bool',
          'offset': 7,
          'length': 1
        };
  
        unformattedValue = Buffer.from([0x01]);
  
        field = new FranchiseFileField(key, unformattedValue, offset, parent);
        field.value = 'false';
        expect(unformattedValue).to.eql(Buffer.from([0x00]));
  
        field.value = 0;
        expect(unformattedValue).to.eql(Buffer.from([0x00]));
  
        field.value = false;
        expect(unformattedValue).to.eql(Buffer.from([0x00]));
      });
  
      it('parses bools correctly - true', () => {
        offset = {
          'type': 'bool',
          'offset': 7,
          'length': 1
        };
  
        unformattedValue = Buffer.from([0x00]);
  
        field = new FranchiseFileField(key, unformattedValue, offset, parent);
        field.value = 'true';
        expect(unformattedValue).to.eql(Buffer.from([0x01]));
  
        field.value = 1;
        expect(unformattedValue).to.eql(Buffer.from([0x01]));
  
        field.value = true;
        expect(unformattedValue).to.eql(Buffer.from([0x01]));
      });
  
      it('parses floats correctly', () => {
        offset = {
          'type': 'float',
          'offset': 0,
          'length': 32
        };
        
        unformattedValue = Buffer.from([0x3F, 0x80, 0x00, 0x00]);
  
        field = new FranchiseFileField(key, unformattedValue, offset, parent);
        field.value = 0.593835935;
        
        expect(unformattedValue).to.eql(Buffer.from([0x3F, 0x18, 0x05, 0xA2]));
      });
  
      it('parses references correctly', () => {
        offset = {
          'type': 'GameStats',
          'isReference': true,
          'offset': 0,
          'length': 32
        };

        unformattedValue = Buffer.from([0x36, 0xD4, 0x00, 0x00]);
  
        field = new FranchiseFileField(key, unformattedValue, offset, parent);
        field.value = '00110110110101000000000000000010';
        expect(unformattedValue).to.eql(Buffer.from([0x36, 0xD4, 0x00, 0x02]));
      });
  
      it('parses enums correctly - valid enum value (set by name)', () => {
        offset = {
          'type': 'ShoeType',
          'offset': 0,
          'length': 8,
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
  
        field = new FranchiseFileField(key, unformattedValue, offset, parent);
        field.value = 'AirJordan';
        expect(unformattedValue).to.eql(Buffer.from([0x15]));
      });

      it('parses enums correctly - valid enum value (set by value)', () => {
        offset = {
          'type': 'ShoeType',
          'offset': 0,
          'length': 8,
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
  
        field = new FranchiseFileField(key, unformattedValue, offset, parent);
        field.value = '0';
        expect(unformattedValue).to.eql(Buffer.from([0x15]));
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
    it('sets the values', () => {
      field = new FranchiseFileField(key, unformattedValue, offset, parent);

      const val = Buffer.from([0x5B]);
      const bv = new BitView(val, val.byteOffset);
      bv.bigEndian = true;

      field.unformattedValue = bv;

      expect(field.unformattedValue).to.equal(bv);
      expect(field.value).to.equal(11);
    });

    it('sets the values - enum', () => {
      offset = {
        'type': 'ShoeType',
        'offset': 0,
        'length': 8,
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

      field = new FranchiseFileField(key, unformattedValue, offset, parent);

      const val = Buffer.from([0x15]);
      const bv = new BitView(val, val.byteOffset);
      bv.bigEndian = true;

      field.unformattedValue = bv;

      expect(field.unformattedValue).to.equal(bv);
      expect(field.value).to.equal('AirJordan');
    });

    it('emits a change event', () => {
      field = new FranchiseFileField(key, unformattedValue, offset, parent);
      field.unformattedValue = new BitView(Buffer.from([0x00]));
      expect(parent.onEvent.callCount).to.equal(1);
    });

    it('throws an error if the argument isn\'t a string', () => {
      field = new FranchiseFileField(key, unformattedValue, offset, parent);
      expect(() => {
        field.unformattedValue = 2;
      }).to.throw(Error);
    });

    it('throws an error if the string contains anything excepts 1s and 0s', () => {
      field = new FranchiseFileField(key, unformattedValue, offset, parent);
      expect(() => {
        field.unformattedValue = '10101014';
      }).to.throw(Error);
    });
  });

  describe('second table scenario', () => {
    beforeEach(() => {
      offset = {
        'type': 'string',
        'maxLength': '10',
        'valueInSecondTable': true,
        'offset': 0,
        'length': 32
      };

      unformattedValue = Buffer.from([0x00, 0x00, 0x00, 0x10]);
      field = new FranchiseFileField(key, unformattedValue, offset, parent);
    });

    it('creates a second table field', () => {
      expect(field.secondTableField).to.not.be.undefined;
      expect(FranchiseFileTable2Field.callCount).to.equal(1);
      expect(FranchiseFileTable2Field.firstCall.args[0]).to.eql(16, offset);
    });

    it('sets the second table field when .value is set', () => {
      field.value = 'hello';
      expect(field.secondTableField.value).to.equal('hello');
    });

    it('should not set the second table field when .unformattedValue is set', () => {
      // this is because the field's unformatted value will contain a reference to the second table field's offset and we need to keep that.
      const val = Buffer.from([0x00, 0x00, 0x00, 0x15]);
      const bv = new BitView(val, val.byteOffset);
      bv.bigEndian = true;
      field.unformattedValue = bv;

      expect(field.secondTableField.value).to.equal('test');
    })
  });

  describe('get reference information', () => {
    let field;

    beforeEach(() => {
      let offset = {
        'isReference': true
      };

      field = new FranchiseFileField('TestReference', Buffer.from([0x39, 0xA8, 0x00, 0x01]), offset);
    });

    it('should return true when calling isReference', () => {
      expect(field.isReference).to.be.true;
    });

    it('can parse the reference information', () => {
      expect(field.referenceData).to.eql({
        'tableId': 7380,
        'rowNumber': 1
      });
    });
  });
});