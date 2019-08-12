const expect = require('chai').expect;
const FranchiseFile = require('../../FranchiseFile');
const FranchiseFileTable = require('../../FranchiseFileTable');
const filePaths = {
  'compressed': {
    'm19': 'tests/data/CAREER-19COMPRESS'
  },
  'uncompressed': {
    'm19': 'tests/data/19UNCOMPRESS.frt'
  }
};

let file;

describe('Madden 19 end to end tests', function () {
  this.timeout(7000);

  // describe('open files', () => {
  //   it('can open a M19 compressed file', () => {
  //     file = new FranchiseFile(filePaths.compressed.m19);
  //   });

  //   it('can open a M19 uncompressed file', () => {
  //     file = new FranchiseFile(filePaths.uncompressed.m19);
  //   });

  //   it('fires the `ready` event when the file is done processing', (done) => {
  //     file = new FranchiseFile(filePaths.compressed.m19);

  //     expect(file.isLoaded).to.be.false;

  //     file.on('ready', () => {
  //       expect(file.settings).to.eql({
  //         'saveOnChange': false
  //       });

  //       expect(file.isLoaded).to.be.true;
  //       expect(file.filePath).to.eql(filePaths.compressed.m19);
  //       expect(file.gameYear).to.equal(19);
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
      file = new FranchiseFile(filePaths.compressed.m19);

      file.on('ready', () => {
        done();
      })
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
          expect(table.isChanged).to.be.false;
          expect(table.recordsRead).to.be.false;
          expect(table.data).to.not.be.undefined;
          expect(table.hexData).to.not.be.undefined;
          expect(table.readRecords).to.exist;
          expect(table.offset).to.equal(1868);
        });

        it('parsed expected header', () => {
          expect(table.header).to.not.be.undefined;
          expect(table.header.tableId).to.equal(4097);
          expect(table.header.data1RecordCount).to.equal(256);
          expect(table.header.record1Size).to.equal(4);
          expect(table.header.headerSize).to.equal(240);
          expect(table.header.hasSecondTable).to.be.false;
          expect(table.header.table1StartIndex).to.equal(240);
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
                expect(record.LocalPopularity).to.equal(0);
                expect(record.RegionalPopularity).to.equal(0);
                expect(record.NationalPopularity).to.equal(0);
              });
  
              it('getValueByKey()', () => {
                expect(record.getValueByKey('LocalPopularity')).to.equal(0); 
                expect(record.getValueByKey('RegionalPopularity')).to.equal(0);
                expect(record.getValueByKey('NationalPopularity')).to.equal(0);
              });

              it('getFieldByKey()', () => {
                let localPopField = record.getFieldByKey('LocalPopularity');
                expect(localPopField).to.not.be.undefined;
                expect(localPopField.value).to.equal(0);
                expect(localPopField.unformattedValue).to.equal('000000000000000000');

                let regionalPopField = record.getFieldByKey('RegionalPopularity');
                expect(regionalPopField).to.not.be.undefined;
                expect(regionalPopField.value).to.equal(0);
                expect(regionalPopField.unformattedValue).to.equal('0000000');
              });
            });

            describe('second record', () => {
              let record;

              beforeEach(() => {
                record = table.records[1];
              });

              it('has expected values', () => {
                expect(record.LocalPopularity).to.equal(85);
                expect(record.RegionalPopularity).to.equal(90);
                expect(record.NationalPopularity).to.equal(85);
              });

              it('has expected unformatted values', () => {
                expect(record.getFieldByKey('LocalPopularity').unformattedValue).to.equal('000000000001010101');
                expect(record.getFieldByKey('NationalPopularity').unformattedValue).to.equal('1010101');
                expect(record.getFieldByKey('RegionalPopularity').unformattedValue).to.equal('1011010');
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
          expect(table.offset).to.equal(4977524);
        });

        it('parsed expected header', () => {
          expect(table.header).to.not.be.undefined;
          expect(table.header.tableId).to.equal(4221);
          expect(table.header.data1RecordCount).to.equal(1);
          expect(table.header.record1Size).to.equal(12);
          expect(table.header.headerSize).to.equal(232);
          expect(table.header.hasSecondTable).to.be.false;
          expect(table.header.table1StartIndex).to.equal(232);
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
            expect(record._data).to.eql('001000000111011000000000111101010010000001110110000001000111101100100000011101100000001000000010');
            expect(record.Player0).to.eql('00100000011101100000000011110101');
            expect(record.Player1).to.eql('00100000011101100000010001111011');
            expect(record.Player2).to.eql('00100000011101100000001000000010');
            expect(record.hexData).to.eql(Buffer.from([32, 118, 0, 245, 32, 118, 4, 123, 32, 118, 2, 2]));
          });
        });
      });
    });

    describe('Player table', () => {
      beforeEach(() => {
        table = file.getTableById(4155);
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
        expect(table.offset).to.equal(2368053);
      });

      it('parsed expected header', () => {
        expect(table.header).to.not.be.undefined;
        expect(table.header.tableId).to.equal(4155);
        expect(table.header.data1RecordCount).to.equal(3960);
        expect(table.header.record1Size).to.equal(340);
        expect(table.header.headerSize).to.equal(1472);
        expect(table.header.hasSecondTable).to.be.true;
        expect(table.header.table1StartIndex).to.equal(1472);
        expect(table.header.table1Length).to.equal(1347676);
        expect(table.header.table2StartIndex).to.equal(1347872);
        expect(table.header.table2Length).to.equal(392040);
      });

      it('has correct schema', () => {
        expect(table.schema).to.not.be.undefined;
        expect(table.schema.attributes.length).to.equal(311);
        expect(table.schema.attributes[0].name).to.equal('IsUserControlled');
        expect(table.schema.attributes[1].name).to.equal('AccelerationRating');
        expect(table.schema.attributes[2].name).to.equal('Age');
        expect(table.schema.attributes[104].name).to.equal('OriginalCarryingRating');
      });

      describe('reads records that are passed in', () => {
        before((done) => {
          table.readRecords(['FirstName', 'LastName', 'Position', 'TRAIT_BIGHITTER', 'MetaMorph_GutBase', 'SeasonStats']).then(() => {
            done();
          });
        });

        it('has expected offset table', () => {
          expect(table.loadedOffsets.length).to.equal(6);
          expect(table.offsetTable.length).to.equal(307);

          let offset0 = table.offsetTable[0];
          expect(offset0.name).to.equal('GameStats');
          expect(offset0.isReference).to.be.true;
          expect(offset0.originalIndex).to.equal(43);
          expect(offset0.index).to.equal(44);
          expect(offset0.offset).to.equal(0);
          expect(offset0.indexOffset).to.equal(0);
          expect(offset0.length).to.equal(32);

          let offset7 = table.offsetTable[7];
          expect(offset7.name).to.equal('MetaMorph_GutBarycentric');
          expect(offset7.isReference).to.be.false;
          expect(offset7.originalIndex).to.equal(90);
          expect(offset7.index).to.equal(90);
          expect(offset7.offset).to.equal(224);
          expect(offset7.indexOffset).to.equal(224);
          expect(offset7.length).to.equal(32);

          let offset201 = table.offsetTable[201];
          expect(offset201.name).to.equal('OriginalBreakSackRating');
          expect(offset201.isReference).to.be.false;
          expect(offset201.originalIndex).to.equal(102);
          expect(offset201.index).to.equal(102);
          expect(offset201.offset).to.equal(2169);
          expect(offset201.indexOffset).to.equal(2144);
          expect(offset201.length).to.equal(7);

          let lastOffset = table.offsetTable[306];
          expect(lastOffset.name).to.equal('RunningStyleRating');
          expect(lastOffset.isReference).to.be.false;
          expect(lastOffset.originalIndex).to.equal(247);
          expect(lastOffset.index).to.equal(247);
          expect(lastOffset.offset).to.equal(2715);
          expect(lastOffset.indexOffset).to.equal(2688);
          expect(lastOffset.length).to.equal(5);

          expect(lastOffset.enum).to.not.be.undefined;
          expect(lastOffset.enum.name).to.equal('RunningStyle');
          expect(lastOffset.enum.members.length).to.equal(20);
          expect(lastOffset.enum.getMemberByName('ShortStrideLoose').value).to.equal(8);
          expect(lastOffset.enum.getMemberByName('LongStrideLoose').unformattedValue).to.equal('01101');
        });

        describe('records have expected values', () => {
          it('first record', () => {
            let record = table.records[0];
            expect(record.GameStats).to.be.undefined;
            expect(record.SeasonStats).to.equal('00000000000000000000000000000000');
            expect(record.FirstName).to.equal('');
            expect(record.LastName).to.equal('C');
            expect(record.MetaMorph_GutBase).to.equal(0.9020000100135803);
            expect(record.Position).to.equal('C');
            expect(record.TRAIT_BIGHITTER).to.equal(false);
          });

          it('Marcus Maye', () => {
            let record = table.records[1700];
            expect(record.GameStats).to.be.undefined;
            expect(record.SeasonStats).to.equal('00101110100000000000010000101010');
            expect(record.FirstName).to.equal('Marcus');
            expect(record.LastName).to.equal('Maye');
            expect(record.MetaMorph_GutBase).to.equal(0.9010000228881836);
            expect(record.Position).to.equal('FS');
            expect(record.TRAIT_BIGHITTER).to.equal(true);
          });

          it('Baker Mayfield', () => {
            let record = table.records[1701];
            expect(record.GameStats).to.be.undefined;
            expect(record.SeasonStats).to.equal('00000000000000000000000000000000');
            expect(record.FirstName).to.equal('Baker');
            expect(record.LastName).to.equal('Mayfield');
            expect(record.MetaMorph_GutBase).to.equal(0.6000000238418579);
            expect(record.Position).to.equal('FirstKeyOffense_'); // probably should be QB!
            expect(record.TRAIT_BIGHITTER).to.equal(false);
          });
        });
      });
    });

    describe('EndofSeasonResigningStartReaction', () => {
      beforeEach(() => {
        table = file.getTableByIndex(431);
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
        expect(table.offset).to.equal(6114273);
      });

      it('parsed expected header', () => {
        expect(table.header).to.not.be.undefined;
        expect(table.header.tableId).to.equal(4527);
        expect(table.header.data1RecordCount).to.equal(1);
        expect(table.header.record1Size).to.equal(32);
        expect(table.header.headerSize).to.equal(260);
        expect(table.header.hasSecondTable).to.be.false;
        expect(table.header.table1StartIndex).to.equal(260);
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

          // let offset7 = table.offsetTable[7];
          // expect(offset7.name).to.equal('Handle');
        });

        // describe('records have expected values', () => {
        //   it('first record', () => {
        //     let record = table.records[0];
        //     expect(record.GameStats).to.be.undefined;
        //     expect(record.SeasonStats).to.equal('00000000000000000000000000000000');
        //     expect(record.FirstName).to.equal('');
        //     expect(record.LastName).to.equal('C');
        //     expect(record.MetaMorph_GutBase).to.equal(0.9020000100135803);
        //     expect(record.Position).to.equal('C');
        //     expect(record.TRAIT_BIGHITTER).to.equal(false);
        //   });

        //   it('Marcus Maye', () => {
        //     let record = table.records[1700];
        //     expect(record.GameStats).to.be.undefined;
        //     expect(record.SeasonStats).to.equal('00101110100000000000010000101010');
        //     expect(record.FirstName).to.equal('Marcus');
        //     expect(record.LastName).to.equal('Maye');
        //     expect(record.MetaMorph_GutBase).to.equal(0.9010000228881836);
        //     expect(record.Position).to.equal('FS');
        //     expect(record.TRAIT_BIGHITTER).to.equal(true);
        //   });

        //   it('Baker Mayfield', () => {
        //     let record = table.records[1701];
        //     expect(record.GameStats).to.be.undefined;
        //     expect(record.SeasonStats).to.equal('00000000000000000000000000000000');
        //     expect(record.FirstName).to.equal('Baker');
        //     expect(record.LastName).to.equal('Mayfield');
        //     expect(record.MetaMorph_GutBase).to.equal(0.6000000238418579);
        //     expect(record.Position).to.equal('FirstKeyOffense_'); // probably should be QB!
        //     expect(record.TRAIT_BIGHITTER).to.equal(false);
        //   });
        // });
      });
    });

    describe('AnnualAwardsAvailablePeriodEndReaction', () => {
      before((done) => {
        table = file.getTableById(4262);
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

    describe('Resign_TeamRequest', () => {
      before((done) => {
        table = file.getTableById(4105);
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
  });
});