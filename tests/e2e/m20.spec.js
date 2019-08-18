const expect = require('chai').expect;
const FranchiseFile = require('../../FranchiseFile');
const FranchiseFileTable = require('../../FranchiseFileTable');
const filePaths = {
  'compressed': {
    'm20': 'tests/data/CAREER-20COMPRESS'
  },
  'uncompressed': {
    'm20': 'tests/data/20UNCOMPRESS.frt'
  },
  'saveTest': {
    'm20': 'tests/data/CAREER-TESTSAVE'
  }
};

let file;

describe('Madden 20 end to end tests', function () {
  this.timeout(7000);

  // describe('open files', () => {
  //   it('can open a M20 compressed file', () => {
  //     file = new FranchiseFile(filePaths.compressed.m20);
  //   });

  //   it('can open a M20 uncompressed file', () => {
  //     file = new FranchiseFile(filePaths.uncompressed.m20);
  //   });

  //   it('fires the `ready` event when the file is done processing', (done) => {
  //     file = new FranchiseFile(filePaths.compressed.m20);

  //     expect(file.isLoaded).to.be.false;

  //     file.on('ready', () => {
  //       expect(file.settings).to.eql({
  //         'saveOnChange': false
  //       });

  //       expect(file.isLoaded).to.be.true;
  //       expect(file.filePath).to.eql(filePaths.compressed.m20);
  //       expect(file.gameYear).to.equal(20);
  //       expect(file.openedFranchiseFile).to.be.true;
  //       expect(file.rawContents).to.not.be.undefined;
  //       expect(file.packedFileContents).to.not.be.undefined;
  //       expect(file.unpackedFileContents).to.not.be.undefined;

  //       expect(file.tables).to.not.be.undefined;
  //       expect(file.schemaList).to.not.be.undefined;

  //       done();
  //     });
  //   });
  // });

  describe('post-open tests', () => {
    before((done) => {
      file = new FranchiseFile(filePaths.compressed.m20);

      file.on('ready', () => {
        done();
      })
    });

    describe('can save', () => {
      it('can save without any changes', (done) => {
        file.save(filePaths.saveTest.m20).then(() => {
          let file2 = new FranchiseFile(filePaths.saveTest.m20);
          file2.on('ready', () => {
            expect(file.rawContents).to.eql(file2.rawContents);
            expect(file.unpackedFileContents).to.eql(file2.unpackedFileContents);
            done();
          });
        });
      });

      it('can save with changes', (done) => {
        let table = file.getTableByName('PopularityComponentTable');
        table.readRecords().then(() => { 
          table.records[0].LocalPopularity = 69; 

          file.save(filePaths.saveTest.m20).then(() => {
            let file2 = new FranchiseFile(filePaths.saveTest.m20);
            file2.on('ready', () => {
              expect(file.unpackedFileContents).to.eql(file2.unpackedFileContents);

              let table2 = file2.getTableByName('PopularityComponentTable');
              table2.readRecords().then(() => {
                expect(table2.records[0].LocalPopularity).to.equal(69);
                table.records[0].LocalPopularity = 85;
                done();
              });
            });
          });
        });
      });
    });

    describe('correctly parses tables', () => {
      let table;

      // we want to test a variety of tables
      //  - normal table without any references or table2 records     (PopularityComponent)
      //  - array table with references                               (Player[])
      //  - table with references and table2 records                  (Player)
      //  - table with function types in the schema                   (?)
      //  - table that has only loaded certain offsets                (Player)
      //  - table that reshuffles the schema attributes for offsets   (Player)

      describe('PopularityComponentTable', () => {
        beforeEach(() => {
          table = file.getTableByName('PopularityComponentTable');
        });

        it('table exists', () => {
          expect(table).to.not.be.undefined;
          expect(table).to.be.instanceOf(FranchiseFileTable);
        });

        it('parses expected attribute values', () => {
          expect(table.isArray).to.be.false;
          expect(table.isChanged).to.be.true; //changed above
          expect(table.recordsRead).to.be.true; //read above
          expect(table.data).to.not.be.undefined;
          expect(table.hexData).to.not.be.undefined;
          expect(table.readRecords).to.exist;
          expect(table.offset).to.equal(1991786);
        });

        it('parsed expected header', () => {
          expect(table.header).to.not.be.undefined;
          expect(table.header.tableId).to.equal(4186);
          expect(table.header.data1RecordCount).to.equal(256);
          expect(table.header.record1Size).to.equal(4);
          expect(table.header.headerSize).to.equal(244);
          expect(table.header.hasSecondTable).to.be.false;
          expect(table.header.table1StartIndex).to.equal(244);
          expect(table.header.table1Length).to.equal(1068);
        });

        it('has correct schema', () => {
          expect(table.schema).to.not.be.undefined;
          expect(table.schema.attributes.length).to.equal(3);
          expect(table.schema.attributes[0].name).to.equal('LocalPopularity');
          expect(table.schema.attributes[1].name).to.equal('NationalPopularity');
          expect(table.schema.attributes[2].name).to.equal('RegionalPopularity')
        });

        describe('read records', () => {
          before((done) => {
            table.readRecords().then(() => {
              done();
            });
          });

          it('populates expected values', () => {
            expect(table.recordsRead).to.be.true;
            expect(table.records.length).to.equal(256);
            expect(table.offsetTable).to.not.be.undefined;
          });

          describe('reads offset table correctly', () => {
            let offsetTable, localPopularity, nationalPopularity, regionalPopularity;

            before(() => {
              offsetTable = table.offsetTable;
              localPopularity = offsetTable[0];
              nationalPopularity = offsetTable[1];
              regionalPopularity = offsetTable[2];
            });

            it('general offset table values', () => {
              expect(table.offsetTable.length).to.equal(3);
              expect(table.offsetTable[0].name).of.equal('LocalPopularity');
              expect(table.offsetTable[1].name).of.equal('NationalPopularity');
              expect(table.offsetTable[2].name).of.equal('RegionalPopularity');
            });

            it('local popularity offset', () => {
              expect(localPopularity.index).to.equal(0);
              expect(localPopularity.indexOffset).to.equal(14);
              expect(localPopularity.offset).to.equal(0);
              expect(localPopularity.type).to.equal('int');
              expect(localPopularity.originalIndex).to.equal(0);
              expect(localPopularity.length).to.equal(18);
              expect(localPopularity.isSigned).to.be.false;
              expect(localPopularity.isReference).to.be.false;
              expect(localPopularity.enum).to.be.undefined;
              expect(localPopularity.final).to.be.false;
              expect(localPopularity.maxValue).to.equal(100);
              expect(localPopularity.minValue).to.equal(0);
            });

            it('national popularity offset', () => {
              expect(nationalPopularity.index).to.equal(1);
              expect(nationalPopularity.indexOffset).to.equal(7);
              expect(nationalPopularity.length).to.equal(7);
              expect(nationalPopularity.offset).to.equal(18);
              expect(nationalPopularity.isSigned).to.be.false;
              expect(nationalPopularity.isReference).to.be.false;
              expect(nationalPopularity.enum).to.be.undefined;
              expect(nationalPopularity.final).to.be.false;
            });

            it('regional popularity offset', () => {
              expect(regionalPopularity.index).to.equal(2);
              expect(regionalPopularity.indexOffset).to.equal(0);
              expect(regionalPopularity.length).to.equal(7);
              expect(regionalPopularity.offset).to.equal(25);
              expect(regionalPopularity.isSigned).to.be.false;
              expect(regionalPopularity.isReference).to.be.false;
              expect(regionalPopularity.enum).to.be.undefined;
              expect(regionalPopularity.final).to.be.false;
            });
          });

          describe('reads records correctly', () => {
            describe('first record', () => {
              let record;

              before(() => {
                record = table.records[0];
              });

              it('access values directly from record', () => {
                expect(record).to.not.be.undefined;
                expect(record.LocalPopularity).to.equal(85);
                expect(record.RegionalPopularity).to.equal(90);
                expect(record.NationalPopularity).to.equal(85);
              });
  
              it('getValueByKey()', () => {
                expect(record.getValueByKey('LocalPopularity')).to.equal(85); 
                expect(record.getValueByKey('RegionalPopularity')).to.equal(90);
                expect(record.getValueByKey('NationalPopularity')).to.equal(85);
              });

              it('getFieldByKey()', () => {
                let localPopField = record.getFieldByKey('LocalPopularity');
                expect(localPopField).to.not.be.undefined;
                expect(localPopField.value).to.equal(85);
                expect(localPopField.unformattedValue).to.equal('000000000001010101');

                let regionalPopField = record.getFieldByKey('RegionalPopularity');
                expect(regionalPopField).to.not.be.undefined;
                expect(regionalPopField.value).to.equal(90);
                expect(regionalPopField.unformattedValue).to.equal('1011010');
              });
            });

            describe('second record', () => {
              let record;

              beforeEach(() => {
                record = table.records[1];
              });

              it('has expected values', () => {
                expect(record.LocalPopularity).to.equal(85);
                expect(record.RegionalPopularity).to.equal(65);
                expect(record.NationalPopularity).to.equal(60);
              });

              it('has expected unformatted values', () => {
                expect(record.getFieldByKey('LocalPopularity').unformattedValue).to.equal('000000000001010101');
                expect(record.getFieldByKey('NationalPopularity').unformattedValue).to.equal('0111100');
                expect(record.getFieldByKey('RegionalPopularity').unformattedValue).to.equal('1000001');
              });
            });
          });
        });
      });

      describe('Player[] table', () => {
        before(() => {
          table = file.getTableByName('Player[]');
        });

        it('table exists', () => {
          expect(table).to.not.be.undefined;
          expect(table).to.be.instanceOf(FranchiseFileTable);
        });

        it('parses expected attribute values', () => {
          expect(table.isArray).to.be.true;
          expect(table.isChanged).to.be.false;
          expect(table.recordsRead).to.be.false;
          expect(table.data).to.not.be.undefined;
          expect(table.hexData).to.not.be.undefined;
          expect(table.readRecords).to.exist;
          expect(table.offset).to.equal(5397528);
        });

        it('parsed expected header', () => {
          expect(table.header).to.not.be.undefined;
          expect(table.header.tableId).to.equal(4321);
          expect(table.header.data1RecordCount).to.equal(1);
          expect(table.header.record1Size).to.equal(12);
          expect(table.header.headerSize).to.equal(232);
          expect(table.header.hasSecondTable).to.be.false;
          expect(table.header.table1StartIndex).to.equal(236);
          expect(table.header.table1Length).to.equal(48);
        });

        it('has correct schema', () => {
          expect(table.schema).to.be.undefined;
        });
        
        describe('reads records', () => {
          before((done) => {
            table.readRecords().then(() => {
              done();
            });
          });

          it('parses offset table correctly', () => {
            expect(table.offsetTable.length).to.equal(3);

            expect(table.offsetTable[0].name).to.equal('Player0');
            expect(table.offsetTable[0].isReference).to.be.true;
            expect(table.offsetTable[0].length).to.equal(32);
            expect(table.offsetTable[0].offset).to.equal(0);

            expect(table.offsetTable[1].name).to.equal('Player1');
            expect(table.offsetTable[1].isReference).to.be.true;
            expect(table.offsetTable[1].length).to.equal(32);
            expect(table.offsetTable[1].offset).to.equal(32);

            expect(table.offsetTable[2].name).to.equal('Player2');
            expect(table.offsetTable[2].isReference).to.be.true;
            expect(table.offsetTable[2].length).to.equal(32);
            expect(table.offsetTable[2].offset).to.equal(64);
          });

          it('reads records correctly', () => {
            expect(table.records.length).to.equal(1);
            expect(table.recordsRead).to.be.true;

            let record = table.records[0];
            expect(record._data).to.eql('001000010000101000000000010111010010000100001010000010001111011000100001000010100000001010100000');
            expect(record.Player0).to.eql('00100001000010100000000001011101');
            expect(record.Player1).to.eql('00100001000010100000100011110110');
            expect(record.Player2).to.eql('00100001000010100000001010100000');
            expect(record.hexData).to.eql(Buffer.from([33, 10, 0, 93, 33, 10, 8, 246, 33, 10, 2, 160]));
          });

          it('saves records correctly', (done) => {
            table.records[0].Player0 = '00100000011101100000010001111011';
            file.save(filePaths.saveTest.m20).then(() => {
              let file2 = new FranchiseFile(filePaths.saveTest.m20);
              file2.on('ready', () => {
                let table = file2.getTableByName('Player[]');
                table.readRecords().then(() => {
                  expect(table.records[0].Player0).to.eql('00100000011101100000010001111011');
                  expect(table.records[0].Player1).to.eql('00100001000010100000100011110110');
                  expect(table.records[0].Player2).to.eql('00100001000010100000001010100000');
                  done();
                });
              });
            });
          });
        });
      });
    });

    describe('Player table', () => {
      beforeEach(() => {
        table = file.getTableById(4229);
      });

      it('table exists', () => {
        expect(table).to.not.be.undefined;
        expect(table).to.be.instanceOf(FranchiseFileTable);
      });

      it('parses expected attribute values', () => {
        expect(table.isArray).to.be.false;
        expect(table.isChanged).to.be.false;
        expect(table.recordsRead).to.be.false;
        expect(table.data).to.not.be.undefined;
        expect(table.hexData).to.not.be.undefined;
        expect(table.readRecords).to.exist;
        expect(table.offset).to.equal(2471596);
      });

      it('parsed expected header', () => {
        expect(table.header).to.not.be.undefined;
        expect(table.header.tableId).to.equal(4229);
        expect(table.header.data1RecordCount).to.equal(3960);
        expect(table.header.record1Size).to.equal(348);
        expect(table.header.headerSize).to.equal(1492);
        expect(table.header.hasSecondTable).to.be.true;
        expect(table.header.table1StartIndex).to.equal(1492);
        expect(table.header.table1Length).to.equal(1379372);
        expect(table.header.table2StartIndex).to.equal(1379572);
        expect(table.header.table2Length).to.equal(415800);
      });

      it('has correct schema', () => {
        expect(table.schema).to.not.be.undefined;
        expect(table.schema.attributes.length).to.equal(315);
        expect(table.schema.attributes[0].name).to.equal('IsUserControlled');
        expect(table.schema.attributes[1].name).to.equal('AccelerationRating');
        expect(table.schema.attributes[2].name).to.equal('Age');
        expect(table.schema.attributes[104].name).to.equal('OriginalBreakSackRating');
      });

      describe('reads records that are passed in', () => {
        before((done) => {
          table.readRecords(['FirstName', 'LastName', 'Position', 'TRAIT_BIGHITTER', 'MetaMorph_GutBase', 'SeasonStats', 'InjuryType']).then(() => {
            done();
          });
        });

        it('has expected offset table', () => {
          expect(table.loadedOffsets.length).to.equal(7);
          expect(table.offsetTable.length).to.equal(311);

          let offset0 = table.offsetTable[0];
          expect(offset0.name).to.equal('GameStats');
          expect(offset0.isReference).to.be.true;
          expect(offset0.originalIndex).to.equal(43);
          expect(offset0.index).to.equal(44);
          expect(offset0.offset).to.equal(0);
          expect(offset0.indexOffset).to.equal(0);
          expect(offset0.length).to.equal(32);

          let offset7 = table.offsetTable[7];
          expect(offset7.name).to.equal('MetaMorph_ThighsBase');
          expect(offset7.isReference).to.be.false;
          expect(offset7.originalIndex).to.equal(96);
          expect(offset7.index).to.equal(96);
          expect(offset7.offset).to.equal(224);
          expect(offset7.indexOffset).to.equal(224);
          expect(offset7.length).to.equal(32);

          let offset201 = table.offsetTable[201];
          expect(offset201.name).to.equal('OriginalBlockSheddingRating');
          expect(offset201.isReference).to.be.false;
          expect(offset201.originalIndex).to.equal(103);
          expect(offset201.index).to.equal(103);
          expect(offset201.offset).to.equal(2201);
          expect(offset201.indexOffset).to.equal(2176);
          expect(offset201.length).to.equal(7);

          let runningStyleOffset = table.offsetTable[304];
          expect(runningStyleOffset.name).to.equal('RunningStyleRating');
          expect(runningStyleOffset.isReference).to.be.false;
          expect(runningStyleOffset.originalIndex).to.equal(251);
          expect(runningStyleOffset.index).to.equal(251);
          expect(runningStyleOffset.offset).to.equal(2732);
          expect(runningStyleOffset.indexOffset).to.equal(2735);
          expect(runningStyleOffset.length).to.equal(5);

          expect(runningStyleOffset.enum).to.not.be.undefined;
          expect(runningStyleOffset.enum.name).to.equal('RunningStyle');
          expect(runningStyleOffset.enum.members.length).to.equal(20);
          expect(runningStyleOffset.enum.getMemberByName('ShortStrideLoose').value).to.equal(8);
          expect(runningStyleOffset.enum.getMemberByName('LongStrideLoose').unformattedValue).to.equal('01101');
        });

        describe('records have expected values', () => {
          it('first record', () => {
            let record = table.records[0];
            expect(record.GameStats).to.be.undefined;
            expect(record.SeasonStats).to.equal('00111100010100100000000000000000');
            expect(record.FirstName).to.equal('Ameer');
            expect(record.LastName).to.equal('Abdullah');
            expect(record.MetaMorph_GutBase).to.equal(1);
            expect(record.Position).to.equal('HB');
            expect(record.TRAIT_BIGHITTER).to.equal(false);
            expect(record.InjuryType).to.equal('Invalid_');
          });

          it('Marcus Maye', () => {
            let record = table.records[1735];
            expect(record.GameStats).to.be.undefined;
            expect(record.SeasonStats).to.equal('00111100010100100000010100110101');
            expect(record.FirstName).to.equal('Marcus');
            expect(record.LastName).to.equal('Maye');
            expect(record.MetaMorph_GutBase).to.equal(0.9010000228881836);
            expect(record.Position).to.equal('FS');
            expect(record.TRAIT_BIGHITTER).to.equal(true);
          });

          it('Baker Mayfield', () => {
            let record = table.records[1736];
            expect(record.GameStats).to.be.undefined;
            expect(record.SeasonStats).to.equal('00111100010100100000010100110110');
            expect(record.FirstName).to.equal('Baker');
            expect(record.LastName).to.equal('Mayfield');
            expect(record.MetaMorph_GutBase).to.equal(0.6000000238418579);
            expect(record.Position).to.equal('QB');
            expect(record.TRAIT_BIGHITTER).to.equal(false);
          });
        });
      });

      describe('can reload the table if new attributes to load are passed', () => {
        it('will re-read records if new attributes are passed in', (done) => {
          table.readRecords(['GameStats']).then(() => {
            expect(table.records[0].GameStats).to.not.be.undefined;
            expect(table.loadedOffsets.length).to.equal(8)
            done();
          }).catch((err) => {
            done(err);
          });
        });
      });

      describe('can set values', () => {
        before((done) => {
          table.readRecords(['GameStats', 'FirstName', 'LastName', 'MetaMorph_GutBase']).then(() => {
            done();
          });
        });

        it('can change Baker Mayfields name', () => {
          let record = table.records[1736];
          record.FirstName = 'Clark';
          record.LastName = 'Kent';
          record.MetaMorph_GutBase = 0.49494949494;

          expect(record.FirstName).to.equal('Clark');
          expect(record.LastName).to.equal('Kent');
          expect(record.MetaMorph_GutBase).to.equal(0.49494949494);
        });

        it('wont allow invalid reference value', () => {
          let record = table.records[1736];

          expect(() => {
            record.getFieldByKey('FirstName').unformattedValue = '30101010101';
          }).to.throw(Error);
        });

        it('wont allow invalid reference values if setting value either', () => {
          let record = table.records[1736];
          
          expect(() => {
            record.GameStats = '222010101';
          }).to.throw(Error);
        });
      });
    });

    describe('EndofSeasonResigningStartReaction', () => {
      beforeEach(() => {
        table = file.getTableByIndex(533);
      });

      it('table exists', () => {
        expect(table).to.not.be.undefined;
        expect(table).to.be.instanceOf(FranchiseFileTable);
        expect(table.name).to.equal('EndofSeasonReSigningStartReaction')
      });

      it('parses expected attribute values', () => {
        expect(table.isArray).to.be.false;
        expect(table.isChanged).to.be.false;
        expect(table.recordsRead).to.be.false;
        expect(table.data).to.not.be.undefined;
        expect(table.hexData).to.not.be.undefined;
        expect(table.readRecords).to.exist;
        expect(table.offset).to.equal(5548893);
      });

      it('parsed expected header', () => {
        expect(table.header).to.not.be.undefined;
        expect(table.header.tableId).to.equal(4629);
        expect(table.header.data1RecordCount).to.equal(1);
        expect(table.header.record1Size).to.equal(32);
        expect(table.header.headerSize).to.equal(264);
        expect(table.header.hasSecondTable).to.be.false;
        expect(table.header.table1StartIndex).to.equal(264);
        expect(table.header.table1Length).to.equal(96);
      });

      it('has correct schema', () => {
        expect(table.schema).to.not.be.undefined;
        expect(table.schema.attributes.length).to.equal(8);
        expect(table.schema.attributes[0].name).to.equal('EventRecord');
        expect(table.schema.attributes[1].name).to.equal('Handle');
        expect(table.schema.attributes[2].name).to.equal('Franchise');
        expect(table.schema.attributes[3].name).to.equal('PlayerSigningEval');
      });

      describe('reads records that are passed in', () => {
        before((done) => {
          table.readRecords().then(() => {
            done();
          });
        });

        it('has expected offset table', () => {
          expect(table.loadedOffsets.length).to.equal(7);
          expect(table.offsetTable.length).to.equal(7);

          let offset0 = table.offsetTable[0];
          expect(offset0.name).to.equal('TeamRequestManager');
          expect(offset0.isReference).to.be.true;
          expect(offset0.originalIndex).to.equal(7);
          expect(offset0.index).to.equal(7);
          expect(offset0.offset).to.equal(0);
          expect(offset0.indexOffset).to.equal(0);
          expect(offset0.length).to.equal(32);

          let offset5 = table.offsetTable[5];
          expect(offset5.name).to.equal('Franchise');

          let offset6 = table.offsetTable[6];
          expect(offset6.name).to.equal('EventRecord');
        });
      });
    });

    describe('AnnualAwardsAvailablePeriodEndReaction', () => {
      before((done) => {
        table = file.getTableById(4362);
        table.readRecords().then(() => {
          done();
        })
      });

      it('reads offset table correctly', () => {
        expect(table.offsetTable[0].name).to.equal('SeasonInfo');
        expect(table.offsetTable[1].name).to.equal('AwardsEvalRef');
        expect(table.offsetTable[2].name).to.equal('EventRecord');
      });
    });

    describe('OverallPercentage', () => {
      before((done) => {
        table = file.getTableByName('OverallPercentage');
        table.readRecords().then(() => {
          done();
        });
      });

      it('reads enum correctly if it has leading zeroes', () => {
        let first = table.records[0].getFieldByKey('PlayerPosition');
        expect(first.offset.enum).to.not.be.undefined;
        expect(first.unformattedValue).to.equal('00000000000000000000000000010000');
        expect(first.value).to.equal('CB');
      });

      it('sets enum correctly if it has leading zeroes', () => {
        let first = table.records[0].getFieldByKey('PlayerPosition');
        first.value = 'WR';
        expect(first.value).to.equal('WR');
        expect(first.unformattedValue).to.equal('00000000000000000000000000000011');
      });

      it('sets unformatted value correctly if the length is correctly passed in', () => {
        let first = table.records[0].getFieldByKey('PlayerPosition');
        first.unformattedValue = '00000000000000000000000000000011';
        expect(first.value).to.equal('WR');
        expect(first.unformattedValue).to.equal('00000000000000000000000000000011');
      });

      it('sets unformatted value correctly if the length isnt correctly passed in', () => {
        let first = table.records[0].getFieldByKey('PlayerPosition');
        first.unformattedValue = '11';
        expect(first.value).to.equal('WR');
        expect(first.unformattedValue).to.equal('00000000000000000000000000000011');
      });

      it('sets to first enum value if incorrect unformatted value is passed in', () => {
        let first = table.records[0].getFieldByKey('PlayerPosition');
        first.unformattedValue = '1000000';
        expect(first.value).to.equal('QB');
        expect(first.unformattedValue).to.equal('00000000000000000000000000000000');
      });

      it('sets enum values as values without an underscore if possible', () => {
        let seventh = table.records[6].getFieldByKey('PlayerPosition');
        expect(seventh.value).to.equal('K');
      });
    });

    /* DISABLED TEST BECAUSE THE TABLE ISNT CONFIGURED CORRECTLY */
    // describe('Resign_TeamRequest', () => {
    //   before((done) => {
    //     table = file.getTableById(4216);
    //     table.readRecords().then(() => {
    //       done();
    //     })
    //   });

    //   it('reads offset table correctly', () => {
    //     expect(table.offsetTable[0].name).to.equal('SeasonInfo');
    //     expect(table.offsetTable[1].name).to.equal('AwardsEvalRef');
    //     expect(table.offsetTable[2].name).to.equal('EventRecord');
    //   });
    // });
  });
});