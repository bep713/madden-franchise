const path = require('path');
const expect = require('chai').expect;
const FranchiseFile = require('../../FranchiseFile');
const FranchiseFileTable = require('../../FranchiseFileTable');
const filePaths = {
  'compressed': {
    'ftc': 'tests/data/FTC_COMPRESS.FTC'
  },
  'uncompressed': {
    'ftc': 'tests/data/FTC_UNCOMPRESS'
  },
  'saveTest': {
    'ftc': 'tests/data/CAREER-TESTSAVE'
  }
};

let file;

describe('Madden 20 FTC end to end tests', function () {
    this.timeout(7000);

    // describe('open files', () => {
    //     it('can open a compressed FTC file', () => {
    //         file = new FranchiseFile(filePaths.compressed.ftc);
    //     });

    //     it('can open an uncompressed FTC file', () => {
    //         file = new FranchiseFile(filePaths.uncompressed.ftc);
    //     });

    //     it('fires the `ready` event when the file is done processing', (done) => {
    //         file = new FranchiseFile(filePaths.compressed.ftc, {
    //           'schemaDirectory': path.join(__dirname, '../data/test-schemas')
    //         });
      
    //         expect(file.isLoaded).to.be.false;
      
    //         file.on('ready', () => {
    //             expect(file.settings).to.eql({
    //                 'saveOnChange': false,
    //                 'schemaOverride': false,
    //                 'schemaDirectory': path.join(__dirname, '../data/test-schemas'),
    //                 'autoParse': true
    //             });
        
    //             expect(file.isLoaded).to.be.true;
    //             expect(file.filePath).to.eql(filePaths.compressed.ftc);
    //             expect(file.gameYear).to.equal(20);
    //             expect(file.rawContents).to.not.be.undefined;
    //             expect(file.packedFileContents).to.not.be.undefined;
    //             expect(file.unpackedFileContents).to.not.be.undefined;
    //             expect(file.type).to.eql({
    //                 'format': 'franchise-common',
    //                 'compressed': true,
    //                 'year': 20
    //             });
        
    //             expect(file.tables).to.not.be.undefined;
    //             expect(file.schemaList).to.not.be.undefined;
    //             expect(file.schemaList.meta.major).to.equal(370);
    //             expect(file.schemaList.meta.minor).to.equal(0);
    //             expect(file.schemaList.path).to.contain('M20_370_0.gz')
        
    //             done();
    //         });
    //     });
    // });

    describe('post-open tests', () => {
        before((done) => {
            file = new FranchiseFile(filePaths.compressed.ftc, {
                'schemaDirectory': path.join(__dirname, '../data/test-schemas')
            });
    
            file.on('ready', () => {
                done();
            })
        });

        describe('can read tables correctly', () => {
            let table;

            describe('EnumTable', () => {
                // basic tests, table2 tests, and references
                beforeEach(() => {
                    table = file.getTableByName('EnumTable');
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
                    expect(table.offset).to.equal(161656);
                });

                it('parses expected header values', () => {
                    expect(table.header.tableId).to.equal(451);
                    expect(table.header.data1RecordCount).to.equal(65);
                    expect(table.header.record1Size).to.equal(8);
                    expect(table.header.headerSize).to.equal(240);
                    expect(table.header.hasSecondTable).to.be.true;
                    expect(table.header.table1StartIndex).to.equal(240);
                    expect(table.header.table1Length).to.equal(560);
                    expect(table.header.table2StartIndex).to.equal(760);
                    expect(table.header.table2Length).to.equal(652);
                });

                it('has correct schema', () => {
                    expect(table.schema).to.not.be.undefined;
                    expect(table.schema.attributes.length).to.equal(2);
                    expect(table.schema.attributes[0].name).to.equal('Entries');
                    expect(table.schema.attributes[1].name).to.equal('Name');
                });

                describe('reads records', () => {
                    before((done) => {
                        table.readRecords().then(() => {
                            done();
                        });
                    });

                    it('populates expected values', () => {
                        expect(table.recordsRead).to.be.true;
                        expect(table.records.length).to.equal(65);
                        expect(table.offsetTable).to.not.be.undefined;
                    });

                    describe('reads offset table correctly', () => {
                        it('Entries', () => {
                            let entries = table.offsetTable[0];

                            expect(entries).to.eql({
                                'const': undefined,
                                'enum': undefined,
                                'final': false,
                                'index': 0,
                                'indexOffset': 0,
                                'isReference': true,
                                'isSigned': false,
                                'length': 32,
                                'maxLength': null,
                                'maxValue': NaN,
                                'minValue': NaN,
                                'name': "Entries",
                                'offset': 0,
                                'originalIndex': 0,
                                'type': "EnumTableEntry[]",
                                'valueInSecondTable': false
                            });
                        });

                        it('Name', () => {
                            let name = table.offsetTable[1];

                            expect(name).to.eql({
                                'const': undefined,
                                'enum': undefined,
                                'final': false,
                                'index': 1,
                                'indexOffset': 32,
                                'isReference': false,
                                'isSigned': false,
                                'length': 32,
                                'maxLength': 44,
                                'maxValue': NaN,
                                'minValue': NaN,
                                'name': "Name",
                                'offset': 32,
                                'originalIndex': 1,
                                'type': "string",
                                'valueInSecondTable': true
                            });
                        });
                    });

                    describe('first record', () => {
                        let record;
          
                        before(() => {
                            record = table.records[0];
                        });
          
                        it('access values directly from record', () => {
                            expect(record).to.not.be.undefined;
                            expect(record.Entries).to.equal('00000110011110000000000000000000');
                            expect(record.Name).to.equal('AwardType');
                        });
            
                        it('getValueByKey()', () => {
                            expect(record.getValueByKey('Entries')).to.equal('00000110011110000000000000000000'); 
                            expect(record.getValueByKey('Name')).to.equal('AwardType');
                        });
          
                        it('getFieldByKey()', () => {
                            let entriesField = record.getFieldByKey('Entries');
                            expect(entriesField).to.not.be.undefined;
                            expect(entriesField.value).to.equal('00000110011110000000000000000000');
                            expect(entriesField.unformattedValue).to.equal('00000110011110000000000000000000');
            
                            let nameField = record.getFieldByKey('Name');
                            expect(nameField).to.not.be.undefined;
                            expect(nameField.value).to.equal('AwardType');
                            expect(nameField.unformattedValue).to.equal('00000000000000000000000000000000');
                        });

                        it('table2 field', () => {
                            let nameTable2Field = record.getFieldByKey('Name').secondTableField;
                            expect(nameTable2Field).to.not.be.undefined;
                            expect(nameTable2Field.index).to.equal(0);
                            expect(nameTable2Field.maxLength).to.equal(44);
                            expect(nameTable2Field.value).to.equal('AwardType');
                            expect(nameTable2Field.unformattedValue).to.equal('01000001011101110110000101110010011001000101010001111001011100000110010100000000');
                        });
                    });

                    describe('second record', () => {
                        let record;
          
                        before(() => {
                            record = table.records[1];
                        });
          
                        it('access values directly from record', () => {
                            expect(record).to.not.be.undefined;
                            expect(record.Entries).to.equal('00000110011001100000000000000000');
                            expect(record.Name).to.equal('City Personality');
                        });
            
                        it('getValueByKey()', () => {
                            expect(record.getValueByKey('Entries')).to.equal('00000110011001100000000000000000'); 
                            expect(record.getValueByKey('Name')).to.equal('City Personality');
                        });
          
                        it('getFieldByKey()', () => {
                            let entriesField = record.getFieldByKey('Entries');
                            expect(entriesField).to.not.be.undefined;
                            expect(entriesField.value).to.equal('00000110011001100000000000000000');
                            expect(entriesField.unformattedValue).to.equal('00000110011001100000000000000000');
            
                            let nameField = record.getFieldByKey('Name');
                            expect(nameField).to.not.be.undefined;
                            expect(nameField.value).to.equal('City Personality');
                            expect(nameField.unformattedValue).to.equal('00000000000000000000000000001010');
                        });

                        it('table2 field', () => {
                            let nameTable2Field = record.getFieldByKey('Name').secondTableField;
                            expect(nameTable2Field).to.not.be.undefined;
                            expect(nameTable2Field.index).to.equal(10);
                            expect(nameTable2Field.maxLength).to.equal(44);
                            expect(nameTable2Field.value).to.equal('City Personality');
                            expect(nameTable2Field.unformattedValue).to.equal('0100001101101001011101000111100100100000010100000110010101110010011100110110111101101110011000010110110001101001011101000111100100000000');
                        });
                    });
                });
            });

            describe('AbilityProgressionTunable[]', () => {
                // testing arrays
                beforeEach(() => {
                    table = file.getTableByName('AbilityProgressionTunable[]');
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
                    expect(table.offset).to.equal(565559);
                });

                it('parses expected header values', () => {
                    expect(table.header.tableId).to.equal(781);
                    expect(table.header.data1RecordCount).to.equal(40);
                    expect(table.header.record1Size).to.equal(256);
                    expect(table.header.headerSize).to.equal(268);
                    expect(table.header.hasSecondTable).to.be.false;
                    expect(table.header.table1StartIndex).to.equal(428);
                    expect(table.header.table1Length).to.equal(10432);
                    expect(table.header.table2StartIndex).to.equal(10668);
                    expect(table.header.table2Length).to.equal(0);
                });

                describe('reads records', () => {
                    before((done) => {
                        table.readRecords().then(() => {
                            done();
                        });
                    });

                    it('populates expected values', () => {
                        expect(table.recordsRead).to.be.true;
                        expect(table.records.length).to.equal(40);
                        expect(table.offsetTable).to.not.be.undefined;
                    });

                    describe('reads offset table correctly', () => {
                        it('Entries', () => {
                            let first = table.offsetTable[0];

                            expect(first).to.eql({
                                'final': false,
                                'index': 0,
                                'indexOffset': 0,
                                'isReference': true,
                                'isSigned': false,
                                'length': 32,
                                'maxLength': null,
                                'maxValue': null,
                                'minValue': null,
                                'name': "AbilityProgressionTunable0",
                                'offset': 0,
                                'type': "AbilityProgressionTunable",
                                'valueInSecondTable': false
                            });
                        });

                        it('Name', () => {
                            let second = table.offsetTable[1];

                            expect(second).to.eql({
                                'final': false,
                                'index': 1,
                                'indexOffset': 32,
                                'isReference': true,
                                'isSigned': false,
                                'length': 32,
                                'maxLength': null,
                                'maxValue': null,
                                'minValue': null,
                                'name': "AbilityProgressionTunable1",
                                'offset': 32,
                                'type': "AbilityProgressionTunable",
                                'valueInSecondTable': false
                            });
                        });
                    });

                    describe('first record', () => {
                        let record;
          
                        before(() => {
                            record = table.records[0];
                        });
          
                        it('access values directly from record', () => {
                            expect(record).to.not.be.undefined;
                            expect(record.AbilityProgressionTunable0).to.equal('00000100001000100000000000000000');
                            expect(record.AbilityProgressionTunable3).to.equal('00000100001000100000000000000011');
                        });
                    });

                    describe('tenth record', () => {
                        let record;
          
                        before(() => {
                            record = table.records[9];
                        });
          
                        it('access values directly from record', () => {
                            expect(record).to.not.be.undefined;
                            expect(record.AbilityProgressionTunable0).to.equal('00000100001000100000000001100110');
                            expect(record.AbilityProgressionTunable17).to.equal('00000100001000100000000001101100');
                        });
                    });
                });
            });

            describe('can specify certain offsets to load', () => {
                describe('Stadium', () => {
                    beforeEach(() => {
                        table = file.getTableByName('Stadium');
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
                        expect(table.offset).to.equal(813062);
                    });
    
                    it('parses expected header values', () => {
                        expect(table.header.tableId).to.equal(1006);
                        expect(table.header.data1RecordCount).to.equal(13);
                        expect(table.header.record1Size).to.equal(144);
                        expect(table.header.headerSize).to.equal(560);
                        expect(table.header.hasSecondTable).to.be.true;
                        expect(table.header.table1StartIndex).to.equal(560);
                        expect(table.header.table1Length).to.equal(2212);
                        expect(table.header.table2StartIndex).to.equal(2432);
                        expect(table.header.table2Length).to.equal(1007);
                    });
    
                    describe('reads records', () => {
                        before((done) => {
                            table.readRecords(['STADIUM_LATITUDE', 'STADIUM_LONGITUDE']).then(() => {
                                done();
                            });
                        });
    
                        it('populates expected values', () => {
                            expect(table.recordsRead).to.be.true;
                            expect(table.records.length).to.equal(13);
                            expect(table.offsetTable).to.not.be.undefined;
                        });
    
                        it('loads only specified offsets + all strings', () => {
                            expect(table.loadedOffsets.length).to.equal(8)
                        });
    
                        describe('first record', () => {
                            let record;
              
                            before(() => {
                                record = table.records[0];
                            });
              
                            it('access values directly from record', () => {
                                expect(record).to.not.be.undefined;
                                expect(record.STADIUM_LATITUDE).to.equal(51);
                                expect(record.Name).to.equal('Deluxe Canopy Stadium');
                            });
                        });
    
                        describe('tenth record', () => {
                            let record;
              
                            before(() => {
                                record = table.records[9];
                            });
              
                            it('access values directly from record', () => {
                                expect(record).to.not.be.undefined;
                                expect(record.STADIUM_ASSETNAME).to.equal('sphere');
                                expect(record.STADIUM_LONGITUDE).to.equal(33);
                            });
                        });
                    });
                });
            });
        });

        describe('can save changes', () => {
            it('can save without any changes', (done) => {
                file.save(filePaths.saveTest.ftc).then(() => {
                    let file2 = new FranchiseFile(filePaths.saveTest.ftc);
                    file2.on('ready', () => {
                        expect(file.rawContents).to.eql(file2.rawContents);
                        expect(file.unpackedFileContents).to.eql(file2.unpackedFileContents);
                        done();
                    });
                });
            });

            it('can save with a change to integer fields', (done) => {
                let table = file.getTableByName('PlayerAbilityAdjustment');
                table.readRecords().then(() => {
                    table.records[15].MaxPercent = 50;
                    table.records[15].MinPercent = 25;

                    file.save(filePaths.saveTest.ftc).then(() => {
                        let file2 = new FranchiseFile(filePaths.saveTest.ftc);
                        file2.on('ready', () => {
                            let table2 = file.getTableByName('PlayerAbilityAdjustment');
                            table2.readRecords().then(() => {
                                expect(table2.records[15].MaxPercent).to.equal(50);
                                expect(table2.records[15].MinPercent).to.equal(25);
                                done();
                            });
                        });
                    });
                });
            });

            it('can save with a change to table2 fields', (done) => {
                let table = file.getTableByName('EnumTable');
                table.readRecords().then(() => {
                    table.records[7].Name = 'DraftTestTestPosition'

                    file.save(filePaths.saveTest.ftc).then(() => {
                        let file2 = new FranchiseFile(filePaths.saveTest.ftc);
                        file2.on('ready', () => {
                            let table2 = file2.getTableByName('EnumTable');
                            table2.readRecords().then(() => {
                                expect(table2.records[0].Name).to.equal('AwardType');
                                expect(table2.records[5].Name).to.equal('Reasons To cut');
                                expect(table2.records[7].Name).to.equal('DraftTestTestPosition');
                                expect(table2.records[10].Name).to.equal('Free Agent Negotiation Status Enum Table');
                                done();
                            });
                        });
                    });
                });
            });

            it('record field values remain correct after modifiying a table2 value and saving', () => {
                let table = file.getTableByName('EnumTable');
                table.readRecords().then(() => {
                    table.records[7].Name = 'DraftTestTestPosition'
                    expect(table.records[7].Name).to.equal('DraftTestTestPosition');

                    file.save(filePaths.saveTest.ftc).then(() => {
                        expect(table.records[7].Name).to.equal('DraftTestTestPosition');
                    });
                });
            });
        });
    });
});