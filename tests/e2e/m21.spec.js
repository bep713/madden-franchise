import fs from 'fs';
import path, { dirname } from 'path';
import { expect } from 'chai';
import { BitView } from 'bit-buffer';
import FranchiseFile from '../../src/FranchiseFile.js';
import FranchiseFileTable from '../../src/FranchiseFileTable.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePaths = {
    compressed: {
        m21: 'tests/data/CAREER-21COMPRESS',
        m23: 'tests/data/CAREER-23COMPRESS'
    },
    uncompressed: {
        m21: 'tests/data/21UNCOMPRESS.frt'
    },
    saveTest: {
        m21: 'tests/data/CAREER-TESTSAVE-21',
        m23: 'tests/data/CAREER-TESTSAVE-23'
    }
};

const playerTableId = 4226;
const playerArrayTableIdToTest = 7720;

let file;

describe('Madden 21 end to end tests', function () {
    this.timeout(7000);

    describe('open files', () => {
        it('can open a M21 compressed file', () => {
            file = new FranchiseFile(filePaths.compressed.m21);
        });

        it('can open a M21 uncompressed file', () => {
            file = new FranchiseFile(filePaths.uncompressed.m21);
        });

        it('fires the `ready` event when the file is done processing', (done) => {
            file = new FranchiseFile(filePaths.compressed.m21, {
                schemaDirectory: path.join(__dirname, '../data/test-schemas')
            });

            expect(file.isLoaded).to.be.false;

            file.on('ready', () => {
                expect(file.settings).to.eql({
                    saveOnChange: false,
                    schemaOverride: false,
                    schemaDirectory: path.join(
                        __dirname,
                        '../data/test-schemas'
                    ),
                    autoParse: true,
                    autoUnempty: false,
                    useNewSchemaGeneration: false,
                    schemaFileMap: {},
                    extraSchemas: undefined,
                    gameYearOverride: null
                });

                expect(file.isLoaded).to.be.true;
                expect(file.filePath).to.eql(filePaths.compressed.m21);
                expect(file.gameYear).to.equal(21);
                expect(file.rawContents).to.not.be.undefined;
                expect(file.packedFileContents).to.not.be.undefined;
                expect(file.unpackedFileContents).to.not.be.undefined;

                expect(file.tables).to.not.be.undefined;
                expect(file.schemaList).to.not.be.undefined;
                expect(file.schemaList.meta.major).to.equal(202);
                expect(file.schemaList.meta.minor).to.equal(15);
                expect(file.schemaList.path).to.contain('M21_202_15.gz');

                done();
            });
        });

        it('can override the schema path through a setting', () => {
            file = new FranchiseFile(filePaths.compressed.m21, {
                schemaOverride: {
                    major: 95,
                    minor: 7,
                    path: path.join(
                        __dirname,
                        '../../data/schemas/19/M19_95_7.gz'
                    )
                }
            });
            file.on('ready', () => {
                expect(file.schemaList.meta.major).to.equal(95);
                expect(file.schemaList.meta.minor).to.equal(7);
                expect(file.schemaList.path).to.contain('19\\M19_95_7.gz');
            });
        });

        // it('throws an error if using an invalid schema', () => {
        //   expect(() => {
        //     file = new FranchiseFile(filePaths.compressed.m21, {
        //       'schemaOverride': {
        //         'major': 95,
        //         'minor': 7,
        //         'path': path.join(__dirname, '../../data/schemas/schema-19.xml')
        //       }
        //     });
        //   }).to.throw(Error);
        // });
    });

    describe('post-open tests', () => {
        before((done) => {
            file = new FranchiseFile(filePaths.compressed.m21, {
                schemaDirectory: path.join(__dirname, '../data/test-schemas')
            });

            file.on('ready', () => {
                done();
            });
        });

        beforeEach(() => {
            // Assume we want to autoUnempty, unless specifically stated.
            file.settings.autoUnempty = true;
        });

        it('can get a table by its unique id', () => {
            const table = file.getTableByUniqueId(1612938518);
            expect(table.name).to.equal('Player');
        });

        describe("can read in the file's asset table", () => {
            it('expected length', () => {
                expect(file.assetTable.length).to.eql(0xd6);
            });

            it('first asset entry is correct', () => {
                expect(file.assetTable[0]).to.eql({
                    assetId: 0x8000086f,
                    reference: 0x3c180000
                });
            });

            it('last asset entry is correct', () => {
                expect(file.assetTable[file.assetTable.length - 1]).to.eql({
                    assetId: 0x802e1f71,
                    reference: 0x38ea0001
                });
            });

            it('can retrieve reference information from an asset id', () => {
                const result = file.getReferenceFromAssetId(0x80163171);
                expect(result).to.eql({
                    tableId: 7708,
                    rowNumber: 10
                });
            });
        });

        describe('can save', () => {
            it('can save without any changes', (done) => {
                file.save(filePaths.saveTest.m21).then(() => {
                    let file2 = new FranchiseFile(filePaths.saveTest.m21);
                    file2.on('ready', () => {
                        expect(file.unpackedFileContents).to.eql(
                            file2.unpackedFileContents
                        );
                        done();
                    });
                });
            });

            it('can save with changes', (done) => {
                let table = file.getTableByName('PopularityComponentTable');
                table.readRecords().then(() => {
                    table.records[0].LocalPopularity = 69;

                    file.save(filePaths.saveTest.m21).then(() => {
                        let file2 = new FranchiseFile(filePaths.saveTest.m21);
                        file2.on('ready', () => {
                            expect(file.unpackedFileContents).to.eql(
                                file2.unpackedFileContents
                            );

                            let table2 = file2.getTableByName(
                                'PopularityComponentTable'
                            );
                            table2.readRecords().then(() => {
                                expect(
                                    table2.records[0].LocalPopularity
                                ).to.equal(69);
                                table.records[0].LocalPopularity = 85;
                                done();
                            });
                        });
                    });
                });
            });

            it('can save table2 fields', (done) => {
                let table = file.getTableByName('Player');
                console.time('read records 1');

                table.readRecords(['FirstName']).then(() => {
                    console.timeEnd('read records 1');

                    console.time('set value');
                    table.records[20].FirstName = 'FirstNameTest';
                    console.timeEnd('set value');

                    console.time('actual save call');

                    file.save(filePaths.saveTest.m21).then(() => {
                        console.timeEnd('actual save call');
                        console.time('read file');
                        let file2 = new FranchiseFile(filePaths.saveTest.m21);

                        file2.on('ready', () => {
                            console.timeEnd('read file');
                            let table2 = file2.getTableByName('Player');
                            console.time('read records 2');

                            table2.readRecords(['FirstName']).then(() => {
                                console.timeEnd('read records 2');
                                expect(table2.records[20].FirstName).to.equal(
                                    'FirstNameTest'
                                );
                                done();
                            });
                        });
                    });
                });
            });

            it('can save a table2 field and a normal field together', (done) => {
                let division = file.getTableByName('Division');
                let popularityComponentTable = file.getTableByName(
                    'PopularityComponentTable'
                );
                let playerArray = file.getTableById(playerArrayTableIdToTest);

                let promises = [
                    division.readRecords(),
                    popularityComponentTable.readRecords(),
                    playerArray.readRecords()
                ];

                Promise.all(promises).then(() => {
                    division.records[4].Name = 'Test Test';
                    popularityComponentTable.records[14].LocalPopularity = 90;
                    let control = playerArray.records[0].Player2;

                    file.save(filePaths.saveTest.m21).then(() => {
                        let file2 = new FranchiseFile(filePaths.saveTest.m21);

                        file2.on('ready', () => {
                            division = file2.getTableByName('Division');
                            popularityComponentTable = file2.getTableByName(
                                'PopularityComponentTable'
                            );

                            promises = [
                                division.readRecords(),
                                popularityComponentTable.readRecords(),
                                playerArray.readRecords()
                            ];

                            Promise.all(promises).then(() => {
                                expect(division.records[4].Name).to.equal(
                                    'Test Test'
                                );
                                expect(
                                    popularityComponentTable.records[14]
                                        .LocalPopularity
                                ).to.equal(90);
                                expect(playerArray.records[0].Player2).to.equal(
                                    control
                                );
                                done();
                            });
                        });
                    });
                });
            });

            it('can save a table2 field and a normal field together with partial fields', (done) => {
                let division = file.getTableByName('Division');
                let popularityComponentTable = file.getTableByName(
                    'PopularityComponentTable'
                );
                let playerArray = file.getTableById(playerArrayTableIdToTest);

                let promises = [
                    division.readRecords(['Name']),
                    popularityComponentTable.readRecords(['LocalPopularity']),
                    playerArray.readRecords()
                ];

                Promise.all(promises).then(() => {
                    division.records[4].Name = 'Test Test';
                    popularityComponentTable.records[14].LocalPopularity = 90;
                    let control = playerArray.records[0].Player2;

                    file.save(filePaths.saveTest.m21).then(() => {
                        let file2 = new FranchiseFile(filePaths.saveTest.m21);

                        file2.on('ready', () => {
                            division = file2.getTableByName('Division');
                            popularityComponentTable = file2.getTableByName(
                                'PopularityComponentTable'
                            );

                            promises = [
                                division.readRecords(),
                                popularityComponentTable.readRecords(),
                                playerArray.readRecords()
                            ];

                            Promise.all(promises).then(() => {
                                expect(division.records[4].Name).to.equal(
                                    'Test Test'
                                );
                                expect(
                                    popularityComponentTable.records[14]
                                        .LocalPopularity
                                ).to.equal(90);
                                expect(playerArray.records[0].Player2).to.equal(
                                    control
                                );
                                done();
                            });
                        });
                    });
                });
            });

            it('can save a table2 field and an array field together', (done) => {
                let division = file.getTableByName('Division');
                let popularityComponentTable = file.getTableByName(
                    'PopularityComponentTable'
                );
                let playerArray = file.getTableById(playerArrayTableIdToTest);

                let promises = [
                    division.readRecords(),
                    popularityComponentTable.readRecords(),
                    playerArray.readRecords()
                ];

                Promise.all(promises).then(() => {
                    division.records[4].Name = 'Test Test';
                    let playerArrayOriginalRef = playerArray.records[0].Player0;
                    playerArray.records[0].Player0 =
                        '00100000011101100000010001111011';
                    let control =
                        popularityComponentTable.records[18].LocalPopularity;

                    file.save(filePaths.saveTest.m21).then(() => {
                        let file2 = new FranchiseFile(filePaths.saveTest.m21);

                        file2.on('ready', () => {
                            division = file2.getTableByName('Division');
                            popularityComponentTable = file2.getTableByName(
                                'PopularityComponentTable'
                            );
                            let playerArray2 = file.getTableById(
                                playerArrayTableIdToTest
                            );

                            promises = [
                                division.readRecords(),
                                popularityComponentTable.readRecords(),
                                playerArray2.readRecords()
                            ];

                            Promise.all(promises).then(() => {
                                expect(division.records[4].Name).to.equal(
                                    'Test Test'
                                );
                                expect(
                                    playerArray2.records[0].Player0
                                ).to.equal('00100000011101100000010001111011');
                                expect(
                                    popularityComponentTable.records[18]
                                        .LocalPopularity
                                ).to.equal(control);
                                playerArray.records[0].Player0 =
                                    playerArrayOriginalRef;
                                done();
                            });
                        });
                    });
                });
            });

            it('can save a normal field and an array field together', (done) => {
                let division = file.getTableByName('Division');
                let popularityComponentTable = file.getTableByName(
                    'PopularityComponentTable'
                );
                let playerArray = file.getTableById(playerArrayTableIdToTest);

                let promises = [
                    division.readRecords(),
                    popularityComponentTable.readRecords(),
                    playerArray.readRecords()
                ];

                Promise.all(promises).then(() => {
                    popularityComponentTable.records[12].RegionalPopularity = 85;
                    let playerArrayOriginalRef = playerArray.records[0].Player0;
                    playerArray.records[0].Player0 =
                        '00111111111101100000010001111011';
                    let control = division.records[4].Name;

                    file.save(filePaths.saveTest.m21).then(() => {
                        let file2 = new FranchiseFile(filePaths.saveTest.m21);

                        file2.on('ready', () => {
                            division = file2.getTableByName('Division');
                            popularityComponentTable = file2.getTableByName(
                                'PopularityComponentTable'
                            );
                            let playerArray2 = file.getTableById(
                                playerArrayTableIdToTest
                            );

                            promises = [
                                division.readRecords(),
                                popularityComponentTable.readRecords(),
                                playerArray2.readRecords()
                            ];

                            Promise.all(promises).then(() => {
                                expect(
                                    popularityComponentTable.records[12]
                                        .RegionalPopularity
                                ).to.equal(85);
                                expect(
                                    playerArray2.records[0].Player0
                                ).to.equal('00111111111101100000010001111011');
                                expect(division.records[4].Name).to.equal(
                                    control
                                );
                                playerArray.records[0].Player0 =
                                    playerArrayOriginalRef;
                                done();
                            });
                        });
                    });
                });
            });

            it('edit field, then load new table and then save both', (done) => {
                let division = file.getTableByName('Division');

                let promises = [division.readRecords()];

                Promise.all(promises).then(() => {
                    division.records[0].PresentationId = 5;

                    let weeklyTip = file.getTableByName('WeeklyTip');
                    weeklyTip.readRecords().then(() => {
                        weeklyTip.records[10].Title = 'The Test Bowl';

                        file.save(filePaths.saveTest.m21).then(() => {
                            let file2 = new FranchiseFile(
                                filePaths.saveTest.m21
                            );

                            file2.on('ready', () => {
                                division = file2.getTableByName('Division');
                                weeklyTip = file2.getTableByName('WeeklyTip');

                                promises = [
                                    division.readRecords(),
                                    weeklyTip.readRecords()
                                ];

                                Promise.all(promises).then(() => {
                                    expect(
                                        division.records[0].PresentationId
                                    ).to.equal(5);
                                    expect(
                                        weeklyTip.records[10].Title
                                    ).to.equal('The Test Bowl');
                                    done();
                                });
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
                    expect(table.isChanged).to.be.false;
                    // expect(table.recordsRead).to.be.true; //read above
                    expect(table.data).to.not.be.undefined;
                    expect(table.hexData).to.not.be.undefined;
                    expect(table.readRecords).to.exist;
                    expect(table.offset).to.equal(1972230);
                });

                it('parsed expected header', () => {
                    expect(table.header).to.not.be.undefined;
                    expect(table.header.tableId).to.equal(4183);
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
                    expect(table.schema.attributes[0].name).to.equal(
                        'LocalPopularity'
                    );
                    expect(table.schema.attributes[1].name).to.equal(
                        'NationalPopularity'
                    );
                    expect(table.schema.attributes[2].name).to.equal(
                        'RegionalPopularity'
                    );
                });

                it('can get a binary reference to a record', () => {
                    const reference = table.getBinaryReferenceToRecord(6);
                    expect(reference).to.eql(
                        '00100000101011100000000000000110'
                    );
                });

                describe('read records', () => {
                    beforeEach((done) => {
                        table.readRecords().then(() => {
                            done();
                        });
                    });

                    it('populates expected values', () => {
                        expect(table.recordsRead).to.be.true;
                        expect(table.records.length).to.equal(256);
                        expect(table.offsetTable).to.not.be.undefined;
                    });

                    it('identifies empty records', () => {
                        expect(table.emptyRecords.size).to.equal(95);
                        expect(table.emptyRecords.get(230)).to.eql({
                            previous: 229,
                            next: 231
                        });
                    });

                    describe('reads offset table correctly', () => {
                        let offsetTable,
                            localPopularity,
                            nationalPopularity,
                            regionalPopularity;

                        before(() => {
                            offsetTable = table.offsetTable;
                            localPopularity = offsetTable[0];
                            nationalPopularity = offsetTable[1];
                            regionalPopularity = offsetTable[2];
                        });

                        it('general offset table values', () => {
                            expect(table.offsetTable.length).to.equal(3);
                            expect(table.offsetTable[0].name).of.equal(
                                'LocalPopularity'
                            );
                            expect(table.offsetTable[1].name).of.equal(
                                'NationalPopularity'
                            );
                            expect(table.offsetTable[2].name).of.equal(
                                'RegionalPopularity'
                            );
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
                                expect(
                                    record.getValueByKey('LocalPopularity')
                                ).to.equal(85);
                                expect(
                                    record.getValueByKey('RegionalPopularity')
                                ).to.equal(90);
                                expect(
                                    record.getValueByKey('NationalPopularity')
                                ).to.equal(85);
                            });

                            it('getFieldByKey()', () => {
                                let localPopField =
                                    record.getFieldByKey('LocalPopularity');
                                expect(localPopField).to.not.be.undefined;
                                expect(localPopField.value).to.equal(85);
                                expect(
                                    localPopField.unformattedValue.getBits(
                                        localPopField.offset.offset,
                                        localPopField.offset.length
                                    )
                                ).to.equal(85);

                                let regionalPopField =
                                    record.getFieldByKey('RegionalPopularity');
                                expect(regionalPopField).to.not.be.undefined;
                                expect(regionalPopField.value).to.equal(90);
                                expect(
                                    regionalPopField.unformattedValue.getBits(
                                        regionalPopField.offset.offset,
                                        regionalPopField.offset.length
                                    )
                                ).to.equal(90);
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
                                expect(
                                    record.fields[
                                        'LocalPopularity'
                                    ].unformattedValue.getBits(0, 18)
                                ).to.equal(85);
                                expect(
                                    record.fields[
                                        'RegionalPopularity'
                                    ].unformattedValue.getBits(25, 7)
                                ).to.equal(65);
                                expect(
                                    record.fields[
                                        'NationalPopularity'
                                    ].unformattedValue.getBits(18, 7)
                                ).to.equal(60);
                            });
                        });
                    });
                });

                describe('updates empty records properly', () => {
                    let record;

                    beforeEach(async () => {
                        await table.readRecords();
                    });

                    describe('can empty a record', () => {
                        beforeEach(() => {
                            record = table.records[0];
                        });

                        it('emptying a record where there is already one or more empty records', () => {
                            // This table is 4 bytes long so we can do this safely
                            const firstRecordValue = table.data.readUInt32BE(
                                table.header.table1StartIndex + 4
                            );

                            record.empty();

                            expect(record.isEmpty).to.be.true;
                            expect(table.emptyRecords.size).to.equal(96);
                            expect(table.emptyRecords.get(255)).to.eql({
                                previous: 254,
                                next: 0
                            });
                            expect(table.emptyRecords.get(0)).to.eql({
                                previous: 255,
                                next: 256
                            });

                            expect(
                                table.data.readUInt32BE(
                                    table.header.table1StartIndex
                                )
                            ).to.equal(256);
                            expect(
                                table.data.readUInt32BE(
                                    table.header.table1StartIndex + 255 * 4
                                )
                            ).to.equal(0);

                            // Make sure the next record buffer is unchanged.
                            expect(
                                table.data.readUInt32BE(
                                    table.header.table1StartIndex + 4
                                )
                            ).to.eql(firstRecordValue);

                            expect(
                                table.records[0].data.readUInt32BE(0)
                            ).to.equal(256);
                            expect(
                                table.records[255].data.readUInt32BE(0)
                            ).to.equal(0);
                        });

                        it('cannot empty an already emptied record', () => {
                            // This table is 4 bytes long so we can do this safely
                            const firstRecordValue = table.data.readUInt32BE(
                                table.header.table1StartIndex + 4
                            );

                            record.empty();

                            expect(table.emptyRecords.size).to.equal(96);
                            expect(table.emptyRecords.get(255)).to.eql({
                                previous: 254,
                                next: 0
                            });
                            expect(table.emptyRecords.get(0)).to.eql({
                                previous: 255,
                                next: 256
                            });

                            expect(
                                table.data.readUInt32BE(
                                    table.header.table1StartIndex
                                )
                            ).to.equal(256);
                            expect(
                                table.data.readUInt32BE(
                                    table.header.table1StartIndex + 255 * 4
                                )
                            ).to.equal(0);

                            // Make sure the next record buffer is unchanged.
                            expect(
                                table.data.readUInt32BE(
                                    table.header.table1StartIndex + 4
                                )
                            ).to.eql(firstRecordValue);

                            expect(
                                table.records[0].data.readUInt32BE(0)
                            ).to.equal(256);
                            expect(
                                table.records[255].data.readUInt32BE(0)
                            ).to.equal(0);
                        });
                    });

                    describe('can fill an empty record', () => {
                        it('filling a record when there is already one or more empty records', () => {
                            expect(table.records[253].isEmpty).to.be.true;

                            table.records[253].LocalPopularity = 20;
                            table.records[253].NationalPopularity = 23;
                            table.records[253].RegionalPopularity = 25;

                            expect(table.records[253].isEmpty).to.be.false;

                            expect(table.emptyRecords.size).to.equal(95);
                            expect(table.emptyRecords.get(252)).to.eql({
                                previous: 251,
                                next: 254
                            });
                            expect(table.emptyRecords.get(254)).to.eql({
                                previous: 252,
                                next: 255
                            });

                            expect(
                                table.data.readUInt32BE(
                                    table.header.table1StartIndex + 252 * 4
                                )
                            ).to.equal(254);
                            expect(
                                table.records[252].data.readUInt32BE(0)
                            ).to.equal(254);
                        });

                        it('filling a record when there is already one or more empty records - last record', () => {
                            table.records[0].LocalPopularity = 20;
                            table.records[0].NationalPopularity = 23;
                            table.records[0].RegionalPopularity = 25;

                            expect(table.emptyRecords.size).to.equal(94);
                            expect(table.emptyRecords.get(255)).to.eql({
                                previous: 254,
                                next: 256
                            });

                            expect(
                                table.data.readUInt32BE(
                                    table.header.table1StartIndex + 255 * 4
                                )
                            ).to.equal(256);
                            expect(
                                table.records[255].data.readUInt32BE(0)
                            ).to.eql(256);
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
                    expect(table.offset).to.equal(5406691);
                });

                it('parsed expected header', () => {
                    expect(table.header).to.not.be.undefined;
                    expect(table.header.tableId).to.equal(4323);
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

                    it('parses array sizes correctly', () => {
                        expect(table.arraySizes.length).to.equal(1);
                        expect(table.arraySizes[0]).to.equal(3);
                    });

                    it('parses array sizes correctly - multiple rows', async () => {
                        const table = file.getTableById(7704);
                        await table.readRecords();

                        expect(table.arraySizes.length).to.equal(
                            table.header.data1RecordCount
                        );
                        expect(table.arraySizes[0]).to.equal(70);
                        expect(table.arraySizes[14]).to.equal(70);
                        expect(table.arraySizes[22]).to.equal(74);
                    });

                    it('reads records correctly', () => {
                        expect(table.records.length).to.equal(1);
                        expect(table.recordsRead).to.be.true;

                        let record = table.records[0];
                        expect(record.Player0).to.eql(
                            '00100001000001000000100000011011'
                        );
                        expect(record.Player1).to.eql(
                            '00100001000001000000001010100001'
                        );
                        expect(record.Player2).to.eql(
                            '00100001000001000000000001010110'
                        );
                        expect(record.hexData).to.eql(
                            Buffer.from([
                                33, 4, 8, 27, 33, 4, 2, 161, 33, 4, 0, 86
                            ])
                        );
                    });

                    it('saves records correctly', (done) => {
                        table.records[0].Player0 =
                            '00100000011101100000010001111011';
                        file.save(filePaths.saveTest.m21).then(() => {
                            let file2 = new FranchiseFile(
                                filePaths.saveTest.m21
                            );
                            file2.on('ready', () => {
                                let table2 = file2.getTableByName('Player[]');
                                table2.readRecords().then(() => {
                                    expect(table2.records[0].Player0).to.eql(
                                        '00100000011101100000010001111011'
                                    );
                                    expect(table2.records[0].Player1).to.eql(
                                        '00100001000001000000001010100001'
                                    );
                                    expect(table2.records[0].Player2).to.eql(
                                        '00100001000001000000000001010110'
                                    );
                                    done();
                                });
                            });
                        });
                    });

                    it('allows users to modify array length', (done) => {
                        let newTable = file.getTableById(7720);

                        newTable.readRecords().then(() => {
                            expect(newTable.arraySizes.length).to.equal(
                                newTable.header.data1RecordCount
                            );
                            expect(newTable.arraySizes[0]).to.equal(396);

                            newTable.records[0].Player396 =
                                '00100000011101100000010001111011';
                            expect(newTable.arraySizes[0]).to.equal(397);

                            file.save(filePaths.saveTest.m21).then(() => {
                                let file2 = new FranchiseFile(
                                    filePaths.saveTest.m21
                                );

                                file2.on('ready', () => {
                                    let table2 = file2.getTableById(7720);

                                    table2.readRecords().then(() => {
                                        expect(table2.arraySizes[0]).to.equal(
                                            397
                                        );
                                        expect(
                                            table2.records[0].Player0
                                        ).to.eql(
                                            '00100001000001000000010001111100'
                                        );
                                        expect(
                                            table2.records[0].Player1
                                        ).to.eql(
                                            '00100001000001000000010111111110'
                                        );
                                        expect(
                                            table2.records[0].Player396
                                        ).to.eql(
                                            '00100000011101100000010001111011'
                                        );
                                        expect(
                                            table2.records[0].Player397
                                        ).to.eql(
                                            '00000000000000000000000000000000'
                                        );
                                        done();
                                    });
                                });
                            });
                        });
                    });

                    it('allows users to modify array length - array size starts at 0', (done) => {
                        let newTable = file.getTableById(7720);

                        newTable.readRecords().then(() => {
                            newTable.arraySizes[0] = 0;
                            newTable.records[0].arraySize = 0;
                            newTable.records[0].Player396 =
                                '00100000011101100000010001111011';
                            expect(newTable.arraySizes[0]).to.equal(397);
                            done();
                        });
                    });

                    it('allows users to modify array length - multiple rows', (done) => {
                        let newTable = file.getTableById(7704);

                        newTable.readRecords().then(() => {
                            expect(newTable.arraySizes.length).to.equal(
                                newTable.header.data1RecordCount
                            );
                            expect(newTable.arraySizes[17]).to.equal(75);
                            expect(newTable.arraySizes[26]).to.equal(70);

                            newTable.records[17].Player75 =
                                '00100000011101100000010001111011';
                            newTable.records[26].Player70 =
                                '00100000011101100000010001111011';
                            expect(newTable.arraySizes[17]).to.equal(76);
                            expect(newTable.arraySizes[26]).to.equal(71);

                            file.save(filePaths.saveTest.m21).then(() => {
                                let file2 = new FranchiseFile(
                                    filePaths.saveTest.m21
                                );

                                file2.on('ready', () => {
                                    let table2 = file2.getTableById(7704);

                                    table2.readRecords().then(() => {
                                        expect(table2.arraySizes[17]).to.equal(
                                            76
                                        );
                                        expect(table2.arraySizes[26]).to.equal(
                                            71
                                        );

                                        expect(
                                            table2.records[17].Player75
                                        ).to.eql(
                                            '00100000011101100000010001111011'
                                        );
                                        expect(
                                            table2.records[26].Player70
                                        ).to.eql(
                                            '00100000011101100000010001111011'
                                        );
                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        describe('Player[] with table store', () => {
            let table;
            const tableId = 7704;

            before(async () => {
                table = file.getTableById(tableId);
                await table.readRecords();
            });

            describe('can calculate empty references', () => {
                it('no changes', () => {
                    const nextRecordToUse = table.header.nextRecordToUse;
                    table.recalculateEmptyRecordReferences();

                    expect(table.header.nextRecordToUse).to.equal(
                        nextRecordToUse
                    );
                    expect(
                        table.data.readUInt32BE(table.header.offsetStart - 4, 4)
                    ).to.equal(nextRecordToUse);
                });

                it('make one record empty', () => {
                    table.records[19].Player0 =
                        '00000000000000000000000000100000';
                    table.recalculateEmptyRecordReferences();

                    expect(table.emptyRecords.size).to.equal(1);
                    expect(table.emptyRecords.get(19)).to.eql({
                        previous: null,
                        next: 32
                    });

                    expect(table.header.nextRecordToUse).to.equal(19);
                    expect(
                        table.data.readUInt32BE(table.header.offsetStart - 4, 4)
                    ).to.equal(19);
                });
            });
        });

        describe('Player table', () => {
            let table;
            const marcusMayeIndex = 1584;
            const bakerMayfieldIndex = 1585;
            const firstEmptyRecordIndex = 2971;

            beforeEach(() => {
                table = file.getTableById(playerTableId);
            });

            it('table exists', () => {
                expect(table).to.not.be.undefined;
                expect(table).to.be.instanceOf(FranchiseFileTable);
            });

            it('parses expected attribute values', () => {
                expect(table.isArray).to.be.false;
                expect(table.isChanged).to.be.false;
                expect(table.recordsRead).to.be.true; // We read them in a test case above "can save changes to table2"
                expect(table.data).to.not.be.undefined;
                expect(table.hexData).to.not.be.undefined;
                expect(table.readRecords).to.exist;
                expect(table.offset).to.equal(2449232);
            });

            it('parsed expected header', () => {
                expect(table.header).to.not.be.undefined;
                expect(table.header.tableId).to.equal(playerTableId);
                expect(table.header.data1RecordCount).to.equal(3960);
                expect(table.header.record1Size).to.equal(348);
                expect(table.header.headerSize).to.equal(1496);
                expect(table.header.hasSecondTable).to.be.true;
                expect(table.header.table1StartIndex).to.equal(1496);
                expect(table.header.table1Length).to.equal(1379376);
                expect(table.header.table2StartIndex).to.equal(1379576);
                expect(table.header.table2Length).to.equal(415800);
            });

            it('has correct schema', () => {
                expect(table.schema).to.not.be.undefined;
                expect(table.schema.attributes.length).to.equal(316);
                expect(table.schema.attributes[0].name).to.equal(
                    'IsUserControlled'
                );
                expect(table.schema.attributes[1].name).to.equal(
                    'AccelerationRating'
                );
                expect(table.schema.attributes[2].name).to.equal('Age');
                expect(table.schema.attributes[104].name).to.equal(
                    'OriginalBreakSackRating'
                );
            });

            describe('reads records that are passed in', () => {
                beforeEach((done) => {
                    table
                        .readRecords([
                            'FirstName',
                            'LastName',
                            'Position',
                            'TRAIT_BIGHITTER',
                            'MetaMorph_GutBase',
                            'SeasonStats',
                            'InjuryType',
                            'TRAIT_COVER_BALL'
                        ])
                        .then(() => {
                            done();
                        });
                });

                it('has expected offset table', () => {
                    expect(table.loadedOffsets.length).to.equal(8);
                    expect(table.offsetTable.length).to.equal(312);

                    let offset0 = table.offsetTable[0];
                    expect(offset0.name).to.equal('GameStats');
                    expect(offset0.isReference).to.be.true;
                    expect(offset0.originalIndex).to.equal(42);
                    expect(offset0.index).to.equal(43);
                    expect(offset0.offset).to.equal(0);
                    expect(offset0.indexOffset).to.equal(0);
                    expect(offset0.length).to.equal(32);

                    let offset7 = table.offsetTable[10];
                    expect(offset7.name).to.equal('MetaMorph_ThighsBase');
                    expect(offset7.isReference).to.be.false;
                    expect(offset7.originalIndex).to.equal(95);
                    expect(offset7.index).to.equal(95);
                    expect(offset7.offset).to.equal(320);
                    expect(offset7.indexOffset).to.equal(320);
                    expect(offset7.length).to.equal(32);

                    let offset201 = table.offsetTable[201];
                    expect(offset201.name).to.equal('OriginalCarryingRating');
                    expect(offset201.isReference).to.be.false;
                    expect(offset201.originalIndex).to.equal(106);
                    expect(offset201.index).to.equal(106);
                    expect(offset201.offset).to.equal(2180);
                    expect(offset201.indexOffset).to.equal(2197);
                    expect(offset201.length).to.equal(7);

                    let runningStyleOffset = table.offsetTable[311];
                    expect(runningStyleOffset.name).to.equal(
                        'RunningStyleRating'
                    );
                    expect(runningStyleOffset.isReference).to.be.false;
                    expect(runningStyleOffset.originalIndex).to.equal(252);
                    expect(runningStyleOffset.index).to.equal(252);
                    expect(runningStyleOffset.offset).to.equal(2779);
                    expect(runningStyleOffset.indexOffset).to.equal(2752);
                    expect(runningStyleOffset.length).to.equal(5);

                    expect(runningStyleOffset.enum).to.not.be.undefined;
                    expect(runningStyleOffset.enum.name).to.equal(
                        'RunningStyle'
                    );
                    expect(runningStyleOffset.enum.members.length).to.equal(20);
                    expect(
                        runningStyleOffset.enum.getMemberByName(
                            'ShortStrideLoose'
                        ).value
                    ).to.equal(8);
                    expect(
                        runningStyleOffset.enum.getMemberByName(
                            'LongStrideLoose'
                        ).unformattedValue
                    ).to.equal('01101');
                });

                describe('records have expected values', () => {
                    it('first record', () => {
                        let record = table.records[0];
                        expect(record.GameStats).to.be.null;
                        expect(record.SeasonStats).to.equal(
                            '00111100010110000000000000000000'
                        );
                        expect(record.FirstName).to.equal('Ameer');
                        expect(record.LastName).to.equal('Abdullah');
                        expect(record.MetaMorph_GutBase).to.equal(1);
                        expect(record.Position).to.equal('HB');
                        expect(record.TRAIT_BIGHITTER).to.equal(false);
                        expect(record.InjuryType).to.equal('Invalid_');
                    });

                    it('Marcus Maye', () => {
                        let record = table.records[marcusMayeIndex];
                        expect(record.GameStats).to.be.null;
                        expect(record.SeasonStats).to.equal(
                            '00111100010110000000010101000010'
                        );
                        expect(record.FirstName).to.equal('Marcus');
                        expect(record.LastName).to.equal('Maye');
                        expect(record.MetaMorph_GutBase).to.equal(
                            0.9010000228881836
                        );
                        expect(record.Position).to.equal('FS');
                        expect(record.TRAIT_BIGHITTER).to.equal(true);
                    });

                    it('Baker Mayfield', () => {
                        let record = table.records[bakerMayfieldIndex];
                        expect(record.GameStats).to.be.null;
                        expect(record.SeasonStats).to.equal(
                            '00111100010110000000010101000011'
                        );
                        expect(record.FirstName).to.equal('Baker');
                        expect(record.LastName).to.equal('Mayfield');
                        expect(record.MetaMorph_GutBase).to.equal(
                            0.6000000238418579
                        );
                        expect(record.Position).to.equal('QB');
                        expect(record.TRAIT_BIGHITTER).to.equal(false);
                    });

                    it('Baker Mayfield - table2 field (First Name)', () => {
                        let record = table.records[bakerMayfieldIndex];
                        const field =
                            record.getFieldByKey('FirstName').secondTableField;

                        expect(field).to.not.be.undefined;
                        expect(field.index).to.equal(166425);
                        expect(field.maxLength).to.equal(17);
                        expect(field.value).to.equal('Baker');
                        expect(field.unformattedValue.length).to.equal(17);
                        expect(field.unformattedValue).to.eql(
                            Buffer.from([
                                0x42, 0x61, 0x6b, 0x65, 0x72, 0, 0, 0, 0, 0, 0,
                                0, 0, 0, 0, 0, 0
                            ])
                        );
                    });

                    it('incorrect enum value is returned correctly', () => {
                        let record = table.records[firstEmptyRecordIndex];
                        expect(record['TRAIT_COVER_BALL']).to.equal('000');
                    });
                });

                it('can set a Player record to empty', () => {
                    let record = table.records[5];
                    record.empty();
                });
            });

            describe('can reload the table if new attributes to load are passed', () => {
                it('will re-read records if new attributes are passed in', (done) => {
                    table
                        .readRecords(['GameStats'])
                        .then(() => {
                            expect(table.records[0].GameStats).to.not.be
                                .undefined;
                            expect(table.loadedOffsets.length).to.equal(9);
                            done();
                        })
                        .catch((err) => {
                            done(err);
                        });
                });
            });

            describe('can set values', () => {
                before((done) => {
                    table
                        .readRecords([
                            'GameStats',
                            'FirstName',
                            'LastName',
                            'MetaMorph_GutBase',
                            'CarryingRating'
                        ])
                        .then(() => {
                            done();
                        });
                });

                it('can change Baker Mayfields name', () => {
                    let record = table.records[bakerMayfieldIndex];
                    record.FirstName = 'Clark';
                    record.LastName = 'Kent';
                    record.MetaMorph_GutBase = 0.49494949494;

                    expect(record.FirstName).to.equal('Clark');
                    expect(record.LastName).to.equal('Kent');
                    expect(record.MetaMorph_GutBase.toFixed(6)).to.equal(
                        '0.494949'
                    ); // string value because of toFixed()
                });

                it('wont allow invalid reference value', () => {
                    let record = table.records[bakerMayfieldIndex];

                    expect(() => {
                        record.getFieldByKey('FirstName').unformattedValue =
                            '30101010101';
                    }).to.throw(Error);
                });

                it('wont allow invalid reference values if setting value either', () => {
                    let record = table.records[bakerMayfieldIndex];

                    expect(() => {
                        record.GameStats = '222010101';
                    }).to.throw(Error);
                });

                it('can set an integer field with a string', () => {
                    let record = table.records[bakerMayfieldIndex];
                    record.CarryingRating = '50';
                    expect(record.CarryingRating).to.equal(50);
                });

                it('can set a float field with a string', () => {
                    let record = table.records[bakerMayfieldIndex];
                    record.MetaMorph_GutBase = '0.60';
                    expect(record.MetaMorph_GutBase).to.equal(0.6);
                });
            });
        });

        describe('EndofSeasonResigningStartReaction', () => {
            let table;
            beforeEach(() => {
                table = file.getTableByIndex(547);
            });

            it('table exists', () => {
                expect(table).to.not.be.undefined;
                expect(table).to.be.instanceOf(FranchiseFileTable);
                expect(table.name).to.equal(
                    'EndofSeasonReSigningStartReaction'
                );
            });

            it('parses expected attribute values', () => {
                expect(table.isArray).to.be.false;
                expect(table.isChanged).to.be.false;
                expect(table.recordsRead).to.be.false;
                expect(table.data).to.not.be.undefined;
                expect(table.hexData).to.not.be.undefined;
                expect(table.readRecords).to.exist;
                expect(table.offset).to.equal(5513745);
            });

            it('parsed expected header', () => {
                expect(table.header).to.not.be.undefined;
                expect(table.header.tableId).to.equal(4643);
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
                expect(table.schema.attributes[3].name).to.equal(
                    'PlayerSigningEval'
                );
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
            let table;
            before((done) => {
                table = file.getTableById(4364);
                table.readRecords().then(() => {
                    done();
                });
            });

            it('reads offset table correctly', () => {
                expect(table.offsetTable[0].name).to.equal('SeasonInfo');
                expect(table.offsetTable[1].name).to.equal('AwardsEvalRef');
                expect(table.offsetTable[2].name).to.equal('EventRecord');
            });
        });

        describe('OverallPercentage', () => {
            let table;
            before((done) => {
                table = file.getTableByName('OverallPercentage');
                table.readRecords().then(() => {
                    done();
                });
            });

            it('reads enum correctly if it has leading zeroes', () => {
                let first = table.records[0].fields.PlayerPosition;
                expect(first.offset.enum).to.not.be.undefined;
                expect(
                    first.unformattedValue.getBits(first.offset.offset, 32)
                ).to.equal(16);
                expect(first.value).to.equal('CB');
            });

            it('sets enum correctly if it has leading zeroes', () => {
                let first = table.records[0].fields.PlayerPosition;
                first.value = 'WR';
                expect(first.value).to.equal('WR');
                expect(
                    first.unformattedValue.getBits(first.offset.offset, 32)
                ).to.equal(3);
            });

            it('sets unformatted value correctly if the length is correctly passed in', () => {
                let first = table.records[0].fields.PlayerPosition;

                const val = Buffer.from([
                    0x36, 0xd4, 0x00, 0x14, 0x00, 0x00, 0x00, 0x3
                ]);
                const bv = new BitView(val, val.byteOffset);
                bv.bigEndian = true;

                first.unformattedValue = bv;

                expect(first.value).to.equal('WR');
                expect(first.unformattedValue.getBits(32, 32)).to.equal(3);
            });

            it('sets unformatted value correctly if the length isnt correctly passed in', () => {
                let first = table.records[0].fields.PlayerPosition;

                const val = Buffer.from([
                    0x36, 0xd4, 0x00, 0x14, 0x00, 0x00, 0x00, 0x2
                ]);
                const bv = new BitView(val, val.byteOffset);
                bv.bigEndian = true;

                first.unformattedValue = bv;

                expect(first.value).to.equal('FB');
                expect(first.unformattedValue.getBits(32, 32)).to.equal(2);
            });

            it('throws an error if unformatted enum value is set to an invalid value', () => {
                let first = table.records[0].fields.PlayerPosition;

                expect(() => {
                    first.unformattedValue = '1000000';
                }).to.throw(Error);

                expect(first.value).to.equal('FB');
                expect(first.unformattedValue.getBits(32, 32)).to.equal(2);
            });

            it('throws an error if enum value is set to an invalid value', () => {
                let first = table.records[0].fields.PlayerPosition;

                expect(() => {
                    first.value = 'Coach';
                }).to.throw(Error);

                expect(first.value).to.equal('FB');
                expect(first.unformattedValue.getBits(32, 32)).to.equal(2);
            });

            it('sets enum values as values without an underscore if possible', () => {
                let seventh = table.records[6].fields.PlayerPosition;
                expect(seventh.value).to.equal('K');
            });

            describe('can empty and fill records', () => {
                it('does not find any empty records', () => {
                    expect(table.emptyRecords.size).to.equal(0);
                });

                it('can empty a record when no other records is empty', () => {
                    table.records[9].empty();

                    // Adds empty record to map
                    expect(table.emptyRecords.size).to.equal(1);
                    expect(table.emptyRecords.get(9)).to.eql({
                        previous: null,
                        next: 21
                    });

                    // Updates header object
                    expect(table.header.nextRecordToUse).to.equal(9);

                    // Updates buffer to reflect header change
                    expect(
                        table.data.readUInt32BE(table.header.headerOffset - 4)
                    ).to.equal(9);

                    // Updates table buffer to reflect change
                    expect(
                        table.data.readUInt32BE(
                            table.header.table1StartIndex +
                                9 * table.header.record1Size
                        )
                    ).to.equal(21);

                    // Updates record buffer to reflect change
                    expect(table.records[9].data.readUInt32BE(0)).to.equal(21);
                });

                it('can empty a 2nd record', () => {
                    table.records[6].empty();

                    // Adds empty record to map
                    expect(table.emptyRecords.size).to.equal(2);
                    expect(table.emptyRecords.get(9)).to.eql({
                        previous: null,
                        next: 6
                    });
                    expect(table.emptyRecords.get(6)).to.eql({
                        previous: 9,
                        next: 21
                    });

                    // Next record to use should still be 9 from above test
                    expect(table.header.nextRecordToUse).to.equal(9);

                    // Buffer should still be 9 from above test
                    expect(
                        table.data.readUInt32BE(table.header.headerOffset - 4)
                    ).to.equal(9);

                    // Updates table buffer to reflect change
                    expect(
                        table.data.readUInt32BE(
                            table.header.table1StartIndex +
                                6 * table.header.record1Size
                        )
                    ).to.equal(21);

                    // Updates table buffer of previous empty record to reflect change
                    expect(
                        table.data.readUInt32BE(
                            table.header.table1StartIndex +
                                9 * table.header.record1Size
                        )
                    ).to.equal(6);

                    // Updates record buffer to reflect change
                    expect(table.records[6].data.readUInt32BE(0)).to.equal(21);

                    // Updates other record buffer to reflect change to point to 6
                    expect(table.records[9].data.readUInt32BE(0)).to.equal(6);
                });

                it('can fill the 1st empty record', () => {
                    table.records[9].PercentageSpline =
                        '10000000000000000000000000000011';

                    // Adds empty record to map
                    expect(table.emptyRecords.size).to.equal(1);
                    expect(table.emptyRecords.get(6)).to.eql({
                        previous: null,
                        next: 21
                    });

                    // Next record to use should now be updated to 6.
                    expect(table.header.nextRecordToUse).to.equal(6);

                    // Buffer should be updated to 6 as well.
                    expect(
                        table.data.readUInt32BE(table.header.headerOffset - 4)
                    ).to.equal(6);
                });

                // it('record stays empty as long as the first 4 bytes reference the 0th table', () => {
                //   table.records[6].PlayerPosition = 'WR';

                //   expect(table.emptyRecords.size).to.equal(1);
                //   expect(table.emptyRecords.get(6)).to.eql({
                //     previous: null,
                //     next: 21
                //   });
                // });

                it('can fill all empty records', () => {
                    table.records[6].PercentageSpline =
                        '10000000000000000000000000000011';

                    // Adds empty record to map
                    expect(table.emptyRecords.size).to.equal(0);

                    // Next record to use should now be updated to 6.
                    expect(table.header.nextRecordToUse).to.equal(21);

                    // Buffer should be updated to 6 as well.
                    expect(
                        table.data.readUInt32BE(table.header.headerOffset - 4)
                    ).to.equal(21);
                });

                it('can manually set the next record to use in the header', async () => {
                    table.records[10].PercentageSpline =
                        '00000000000000000000000000010101';
                    table.setNextRecordToUse(10, true);

                    // Adds empty record to map
                    expect(table.emptyRecords.size).to.equal(1);

                    // Next record to use should now be updated to 5.
                    expect(table.header.nextRecordToUse).to.equal(10);

                    // Buffer should be updated to 6 as well.
                    expect(
                        table.data.readUInt32BE(table.header.headerOffset - 4)
                    ).to.equal(10);

                    // Save test
                    await file.save(filePaths.saveTest.m21);

                    let file2 = new FranchiseFile(filePaths.saveTest.m21);

                    let readyPromise = new Promise((resolve) => {
                        file2.on('ready', () => {
                            resolve();
                        });
                    });

                    await readyPromise;

                    let table2 = file2.getTableByName('OverallPercentage');
                    await table2.readRecords();

                    expect(table2.header.nextRecordToUse).to.eql(10);
                });

                it('recalcuating empty records returns expected result', () => {
                    table.records[5].PercentageSpline =
                        '00000000000000000000000000000110';
                    table.records[6].PercentageSpline =
                        '00000000000000000000000000010101';
                    table.setNextRecordToUse(5, true);

                    // Adds empty record to map
                    expect(table.emptyRecords.size).to.equal(2);
                    expect(table.emptyRecords.get(5)).to.eql({
                        previous: null,
                        next: 6
                    });
                    expect(table.emptyRecords.get(6)).to.eql({
                        previous: 5,
                        next: 21
                    });

                    // Next record to use should now be updated to 5.
                    expect(table.header.nextRecordToUse).to.equal(5);

                    // Buffer should be updated to 5 as well.
                    expect(
                        table.data.readUInt32BE(table.header.headerOffset - 4)
                    ).to.equal(5);
                });

                describe('can automatically determine empty record references', () => {
                    it('updates the nextRecordToUse', async () => {
                        table.records[10].PercentageSpline =
                            '10000000000000000000000000000101';
                        table.records[7].PercentageSpline =
                            '00000000000000000000000000000101';
                        table.recalculateEmptyRecordReferences();

                        // Adds empty record to map
                        expect(table.emptyRecords.size).to.equal(3);
                        expect(table.emptyRecords.get(5)).to.eql({
                            previous: 7,
                            next: 6
                        });
                        expect(table.emptyRecords.get(7)).to.eql({
                            previous: null,
                            next: 5
                        });
                        expect(table.emptyRecords.get(6)).to.eql({
                            previous: 5,
                            next: 21
                        });

                        // Next record to use should now be updated to 7.
                        expect(table.header.nextRecordToUse).to.equal(7);

                        // Buffer should be updated to 7 as well.
                        expect(
                            table.data.readUInt32BE(
                                table.header.headerOffset - 4
                            )
                        ).to.equal(7);

                        // Save test
                        await file.save(filePaths.saveTest.m21);

                        let file2 = new FranchiseFile(filePaths.saveTest.m21);

                        let readyPromise = new Promise((resolve) => {
                            file2.on('ready', () => {
                                resolve();
                            });
                        });

                        await readyPromise;

                        let table2 = file2.getTableByName('OverallPercentage');
                        await table2.readRecords();

                        expect(table2.header.nextRecordToUse).to.eql(7);
                    });

                    it('updates the empty record reference map if a value changes in the middle of the list', () => {
                        table.records[5].empty();
                        table.records[10].empty();
                        table.recalculateEmptyRecordReferences();

                        expect(table.emptyRecords.size).to.equal(4);
                        expect(table.emptyRecords.get(7)).to.eql({
                            previous: null,
                            next: 5
                        });
                        expect(table.emptyRecords.get(5)).to.eql({
                            previous: 7,
                            next: 6
                        });
                        expect(table.emptyRecords.get(10)).to.eql({
                            previous: 6,
                            next: 21
                        });
                        expect(table.emptyRecords.get(6)).to.eql({
                            previous: 5,
                            next: 10
                        });
                    });

                    it('works if there are no more empty references', () => {
                        table.records[7].PercentageSpline =
                            '10000000000000000000000000001010';
                        table.records[5].PercentageSpline =
                            '10000000000000000000000000001010';
                        table.records[10].PercentageSpline =
                            '10000000000000000000000000001010';
                        table.records[6].PercentageSpline =
                            '10000000000000000000000000001010';
                        table.recalculateEmptyRecordReferences();

                        expect(table.emptyRecords.size).to.equal(0);

                        // Next record to use should now be updated to 7.
                        expect(table.header.nextRecordToUse).to.equal(21);

                        // Buffer should be updated to 7 as well.
                        expect(
                            table.data.readUInt32BE(
                                table.header.headerOffset - 4
                            )
                        ).to.equal(21);
                    });
                });
            });
        });

        describe('Stadium', () => {
            let table;
            before((done) => {
                table = file.getTableByName('Stadium');
                table.readRecords(['STADIUM_FLAGBASEBALL']).then(() => {
                    done();
                });
            });

            it('can set a boolean attribute', () => {
                let record = table.records[0];

                record.STADIUM_FLAGBASEBALL = true;
                expect(record.STADIUM_FLAGBASEBALL).to.be.true;

                record.STADIUM_FLAGBASEBALL = false;
                expect(record.STADIUM_FLAGBASEBALL).to.be.false;
            });

            it('can set a boolean attribute with a string', () => {
                let record = table.records[0];

                record.STADIUM_FLAGBASEBALL = 'true';
                expect(record.STADIUM_FLAGBASEBALL).to.be.true;

                record.STADIUM_FLAGBASEBALL = 'false';
                expect(record.STADIUM_FLAGBASEBALL).to.be.false;
            });

            it('can set a boolean attribute with an integer', () => {
                let record = table.records[0];

                record.STADIUM_FLAGBASEBALL = 1;
                expect(record.STADIUM_FLAGBASEBALL).to.be.true;

                record.STADIUM_FLAGBASEBALL = 0;
                expect(record.STADIUM_FLAGBASEBALL).to.be.false;
            });
        });

        describe('Team', () => {
            let table;
            before((done) => {
                table = file.getTableByIndex(3612);
                table.readRecords(['WeeklyDefenseMedal']).then(() => {
                    done();
                });
            });

            it('can set a negative enum attribute', () => {
                let record = table.records[0];

                record.WeeklyDefenseMedal = 'MedalNone';
                expect(record.WeeklyDefenseMedal).to.equal('MedalNone');

                // Normally, 8 = "1000". Since this enum is a maxLength of 4, "1000" = -1, which equals MedalNone.
                expect(
                    record.fields.WeeklyDefenseMedal.unformattedValue.getBits(
                        record.fields.WeeklyDefenseMedal.offset.offset,
                        4
                    )
                ).to.equal(8);
            });
        });

        describe('Spline', () => {
            let table;
            before((done) => {
                table = file.getTableByName('Spline');
                table.readRecords().then(() => {
                    done();
                });
            });

            it('correctly parses attribute types', () => {
                expect(table.offsetTable.length).to.equal(2);
                expect(table.offsetTable[0].type).to.equal('int[]');
                expect(table.offsetTable[0].isReference).to.equal(true);
            });
        });

        describe('int[]', () => {
            let table;
            const intArrayTableId = 7257;

            before((done) => {
                table = file.getTableById(intArrayTableId); //OverallPercentage -> Spline -> int[]
                table.readRecords().then(() => {
                    done();
                });
            });

            it('correctly parses attribute types', () => {
                expect(table.offsetTable[0].type).to.equal('int');
                expect(table.offsetTable[0].isReference).to.equal(false);
            });

            it('correctly reads in records', () => {
                expect(table.records[0].int0).to.equal(56);
            });

            it('changes record correctly', () => {
                table.records[0].int0 = 54;
                expect(table.records[0].int0).to.equal(54);
                expect(
                    table.records[0].fieldsArray[0].unformattedValue.getBits(
                        table.records[0].fieldsArray[0].offset.offset,
                        32
                    )
                ).to.equal(2147483702);
            });

            it('changes an invalid value to the minimum allowed value', (done) => {
                table.records[0].int0 = -1;
                expect(table.records[0].int0).to.equal(-1);
                expect(
                    table.records[0].fieldsArray[0].unformattedValue.getBits(
                        table.records[0].fieldsArray[0].offset.offset,
                        32
                    )
                ).to.equal(0x7fffffff);

                file.save(filePaths.saveTest.m21).then(() => {
                    let file2 = new FranchiseFile(filePaths.saveTest.m21);
                    file2.on('ready', () => {
                        let table2 = file2.getTableById(intArrayTableId);
                        table2.readRecords().then(() => {
                            expect(table2.records[0].int0).to.eql(-1);
                            expect(
                                table.records[0].fieldsArray[0].unformattedValue.getBits(
                                    table.records[0].fieldsArray[0].offset
                                        .offset,
                                    32
                                )
                            ).to.eql(0x7fffffff);
                            done();
                        });
                    });
                });
            });
        });

        describe('PlayerPositionLookupTable', () => {
            let table;
            const tableId = 6445;

            before(async () => {
                table = file.getTableById(tableId);
                await table.readRecords();
            });

            it('recognizes type `record` as a reference', () => {
                expect(table.records[0].fieldsArray[0].isReference).to.be.true;
            });

            it('contains correct reference', () => {
                expect(table.records[0].getReferenceDataByKey('WR')).to.eql({
                    tableId: 7308,
                    rowNumber: 14
                });
            });
        });

        describe('can follow references', () => {
            it('can follow reference data correctly', () => {
                const playerArrayTable = file.getTableByName('Player[]');
                let record = playerArrayTable.records[0];

                const result = file.getReferencedRecord(record.Player1);
                const expectedResult =
                    file.getTableById(playerTableId).records[673];

                expect(result).to.eql(expectedResult);
            });

            it('handle referenced tables not loaded yet', () => {
                const playerTable = file.getTableByName('Player');
                const record = playerTable.records[0];

                const result = file.getReferencedRecord(record.SeasonStats);
                expect(result).to.be.undefined;
            });
        });

        describe('Tweet', () => {
            let table;
            const tweetTableId = 4293;

            before(async () => {
                table = file.getTableById(tweetTableId);
                await table.readRecords();
            });

            it('can set two table2 fields that exist in the file in inverse order', async () => {
                table.records[0].AuthorName = 'Test';
                table.records[0].ImageData = 'It works';

                expect(table.records[0].AuthorName).to.equal('Test');
                expect(table.records[0].ImageData).to.equal('It works');

                await file.save(filePaths.saveTest.m21);

                let file2 = new FranchiseFile(filePaths.saveTest.m21);

                await new Promise((resolve) => {
                    file2.on('ready', () => {
                        resolve();
                    });
                });

                const newTable = file2.getTableById(tweetTableId);
                await newTable.readRecords();

                expect(newTable.records[0].AuthorName).to.equal('Test');
                expect(newTable.records[0].ImageData).to.equal('It works');
            });

            describe('can replace raw data', () => {
                it('replace with the same data', async () => {
                    table.replaceRawData(table.data);
                    expect(table.recordsRead).to.be.false;
                    expect(table.records.length).to.equal(0);
                    expect(table.table2Records.length).to.equal(0);
                    expect(table.emptyRecords.size).to.equal(0);
                });

                it('re-read records from the same data', async () => {
                    await table.readRecords();

                    expect(table.recordsRead).to.be.true;
                    expect(table.records.length).to.equal(101);
                    expect(table.table2Records.length).to.equal(303);
                    expect(table.emptyRecords.size).to.equal(97);

                    expect(table.records[1].TweetHash).to.equal(1685623759);
                    expect(table.records[1].Tweet).to.equal(
                        'Wonder how Matt Patricia will do this year. Still have some questions.'
                    );
                    expect(table.records[1].AuthorName).to.equal(
                        'Charles Davis@CharlesDavisEA'
                    );
                });

                it('can replace with modified data', async () => {
                    const modifiedData = fs.readFileSync(
                        path.join(
                            __dirname,
                            '../data/table-import/21_TweetTableModified.dat'
                        )
                    );
                    await table.replaceRawData(modifiedData, true);

                    expect(table.recordsRead).to.be.true;
                    expect(table.records.length).to.equal(101);
                    expect(table.table2Records.length).to.equal(303);
                    expect(table.emptyRecords.size).to.equal(97);

                    expect(table.header.tableId).to.equal(4000);
                    expect(table.records[1].TweetHash).to.equal(1);
                    expect(table.records[1].Tweet).to.equal('Jesus, Tony');
                    expect(table.records[1].AuthorName).to.equal(
                        'Baker Mayfield'
                    );
                });

                it('modified data is saved properly', async () => {
                    await file.save(filePaths.saveTest.m21);

                    let file2 = new FranchiseFile(filePaths.saveTest.m21);
                    await new Promise((resolve) => {
                        file2.on('ready', () => {
                            resolve();
                        });
                    });

                    const table = file2.getTableById(4000);
                    expect(table).to.exist;

                    await table.readRecords();
                    expect(table.header.tableId).to.equal(4000);
                    expect(table.records[1].TweetHash).to.equal(1);
                    expect(table.records[1].Tweet).to.equal('Jesus, Tony');
                    expect(table.records[1].AuthorName).to.equal(
                        'Baker Mayfield'
                    );
                });
            });
        });

        describe('can get references to a specific record', () => {
            it('expected result', () => {
                const references = file.getReferencesToRecord(7290, 0);
                const overallPercentageTable = file.getTableById(4097);

                expect(references.length).to.equal(2);
                expect(references[0].tableId).to.eql(4097);
                expect(references[0].name).to.eql('OverallPercentage');
                expect(references[0].table).to.eql(overallPercentageTable);
            });

            it('expected result - Team', () => {
                const references = file.getReferencesToRecord(7708, 0);

                const seasonGameTable = file.getTableById(4148);
                const teamArrayTable = file.getTableById(4675);
                const playerStatRecord = file.getTableById(7698);

                expect(references.length).to.equal(14);

                expect(references[0].tableId).to.eql(4148);
                expect(references[0].name).to.eql('SeasonGame');
                expect(references[0].table).to.eql(seasonGameTable);

                expect(references[4].tableId).to.eql(4675);
                expect(references[4].name).to.eql('Team[]');
                expect(references[4].table).to.eql(teamArrayTable);

                expect(references[11].tableId).to.eql(7698);
                expect(references[11].name).to.eql('PlayerStatRecord');
                expect(references[11].table).to.eql(playerStatRecord);
            });
        });

        describe('ResponseForm[] - last table', () => {
            let table;
            const lastTableId = 7789;

            before(async () => {
                table = file.getTableById(lastTableId);
                await table.readRecords();
            });

            it('trailing 8 bytes of file is not included in data', () => {
                expect(table.data.length).to.equal(0x114);
            });
        });

        describe('TeamNeedEvaluation', () => {
            let table;
            const tableId = 4103;

            before(async () => {
                table = file.getTableById(tableId);
                await table.readRecords();
            });

            it('correctly identifies first empty record', () => {
                expect(table.header.nextRecordToUse).to.equal(878);
            });

            it('recognizes record as not empty after editing first column', () => {
                table.records[878].Depth = 1;

                expect(table.records[878].isEmpty).to.be.false;
                expect(table.header.nextRecordToUse).to.equal(879);
            });

            it('does not zero out the first 32 bits since changed field is part of first 32 bytes', () => {
                // each record is only 4 bytes long
                table.records[878].Depth = 1;
                expect(
                    table.records[878].data.readUInt32BE(0)
                ).to.be.greaterThan(0);
            });

            it('recognizes record as not empty after editing last column', () => {
                table.records[879].Severity = 25;
                expect(table.header.nextRecordToUse).to.equal(880);
            });

            it('will not clear out values changed if first column was edited before last column', () => {
                table.records[880].Depth; // caching values
                table.records[880].Severity; // caching values

                table.records[880].Depth = 1;
                table.records[880].Severity = 25;

                expect(table.records[880].isEmpty).to.be.false;
                expect(table.records[880].Depth).to.equal(1); // check that value persists
                expect(table.records[880].Severity).to.equal(25); // check that value persists
            });
        });

        describe('Coach', () => {
            let table;
            const tableId = 4152;

            before(async () => {
                table = file.getTableById(tableId);
                await table.readRecords();
            });

            it('external table reference should remain intact as the user entered it', async () => {
                table.records[0].DefensivePlaybook =
                    '10000000000000011001100000100000';
                expect(table.records[0].DefensivePlaybook).to.equal(
                    '10000000000000011001100000100000'
                );

                // Save test
                await file.save(filePaths.saveTest.m21);

                let file2 = new FranchiseFile(filePaths.saveTest.m21);

                let readyPromise = new Promise((resolve) => {
                    file2.on('ready', () => {
                        resolve();
                    });
                });

                await readyPromise;

                let table2 = file2.getTableById(tableId);
                await table2.readRecords();

                expect(table2.records[0].DefensivePlaybook).to.equal(
                    '10000000000000011001100000100000'
                );
            });

            it('changing a table2 value should mark the entire row as not empty', () => {
                table.records[137].FirstName = 'Test';
                expect(table.records[137].isEmpty).to.be.false;
            });

            it('changing an empty table2 value will reset the table2 offsets for that record', async () => {
                table.records[137].FirstName = 'Test';

                // first string in first record stays at offset 0
                expect(
                    table.records[0]._fields.FirstName.secondTableField.offset
                ).to.equal(0);

                // previously empty row points to its allocated table2 bytes (non-FTC files allocate bytes for empty rows)
                expect(
                    table.records[137]._fields.FirstName.secondTableField.offset
                ).to.equal(12878);
                expect(
                    table.records[137]._fields.LastName.secondTableField.offset
                ).to.equal(12895);
                expect(
                    table.records[137]._fields.AssetName.secondTableField.offset
                ).to.equal(12913);
                expect(
                    table.records[137]._fields.Name.secondTableField.offset
                ).to.equal(12954);
            });

            it("changing an empty table2 value will un-empty the row and zero out the first 4 bytes if the field isn't part of it", () => {
                table.records[137].FirstName = 'Test';

                expect(table.records[137].data.readUInt32BE(0)).to.equal(0);
                const recordStartIndex =
                    table.header.table1StartIndex +
                    137 * table.header.record1Size;
                expect(table.data.readUInt32BE(recordStartIndex)).to.equal(0);
            });

            it("when the first 4 bytes are zeroed out, the first column's value changes as well", () => {
                let value = table.records[138].SeasonalGoal; // read the value first so its cached

                table.records[138].FirstName = 'Test';
                expect(value).to.not.equal('00000000000000000000000000000000');
                expect(table.records[138].SeasonalGoal).to.equal(
                    '00000000000000000000000000000000'
                );
            });

            it('changing an empty table2 value will persist the new values and new offsets', async () => {
                const firstRowFirstName = table.records[0].FirstName;

                table.records[138].FirstName = 'Test1';
                expect(table.records[138].FirstName).to.equal('Test1');

                // Save test
                await file.save(filePaths.saveTest.m21);

                let file2 = new FranchiseFile(filePaths.saveTest.m21);

                let readyPromise = new Promise((resolve) => {
                    file2.on('ready', () => {
                        resolve();
                    });
                });

                await readyPromise;

                let table2 = file2.getTableById(tableId);
                await table2.readRecords();

                expect(table2.records[0].FirstName).to.equal(firstRowFirstName);
                expect(table2.records[138].FirstName).to.equal('Test1');

                expect(
                    table.records[137]._fields.FirstName.secondTableField.offset
                ).to.equal(12878);
                expect(
                    table.records[137]._fields.LastName.secondTableField.offset
                ).to.equal(12895);
                expect(
                    table.records[137]._fields.AssetName.secondTableField.offset
                ).to.equal(12913);
                expect(
                    table.records[137]._fields.Name.secondTableField.offset
                ).to.equal(12954);
            });

            it('if a field in the first 4 bytes is changed, it should not get zeroed out', () => {
                table.records[139].SeasonalGoal =
                    '10000000000000001110101110010111';
                expect(table.records[139].SeasonalGoal).to.equal(
                    '10000000000000001110101110010111'
                );

                expect(table.records[140].SeasonalGoal).to.not.equal(
                    '10000000000000001110101110010111'
                );
                table.records[140].FirstName = 'Test';
                table.records[140].SeasonalGoal =
                    '10000000000000001110101110010111';
                expect(table.records[140].SeasonalGoal).to.equal(
                    '10000000000000001110101110010111'
                );
            });

            it('can recalculate empty references after un-emptying a row', () => {
                table.recalculateEmptyRecordReferences();
                expect(table.emptyRecords.get(136)).to.eql({
                    previous: 135,
                    next: 141
                });

                expect(table.emptyRecords.get(137)).to.eql(undefined); // un-emptied in a test above
                expect(table.emptyRecords.get(138)).to.eql(undefined); // un-emptied in a test above
                expect(table.emptyRecords.get(139)).to.eql(undefined); // un-emptied in a test above
                expect(table.emptyRecords.get(140)).to.eql(undefined); // un-emptied in a test above

                expect(table.emptyRecords.get(141)).to.eql({
                    previous: 136,
                    next: 142
                });
            });

            it('field isChanged attribute is reset after saving', async () => {
                table.records[138].FirstName = 'Test2';
                expect(table.records[138]._fieldsArray[14].isChanged).to.be
                    .true;

                // Save test
                await file.save(filePaths.saveTest.m21);

                expect(table.records[138]._fieldsArray[14].isChanged).to.be
                    .false;
            });
        });

        describe('TalentNodeStatus', () => {
            const tableId = 4294;
            let table;
            let m23File;

            before(async () => {
                await new Promise((resolve) => {
                    m23File = new FranchiseFile(filePaths.compressed.m23, {
                        schemaDirectory: path.join(
                            __dirname,
                            '../data/test-schemas'
                        )
                    });

                    m23File.on('ready', async () => {
                        table = m23File.getTableById(tableId);
                        await table.readRecords();
                        resolve();
                    });
                });
            });

            it('can set the value of an empty record enum', () => {
                table.records[2778].TalentStatus = 'NotOwned';
                expect(table.records[2778].TalentStatus).to.equal('NotOwned');
                expect(table.records[2778].isEmpty).to.be.false;
            });

            it('can set the value of an enum to an empty record reference', () => {
                table.records[2778].TalentStatus = '1010110';
                expect(table.records[2778].TalentStatus).to.equal('1010110');
                expect(table.records[2778].isEmpty).to.be.false;
            });

            // it('recalculating empty records can detect user-entered empty enum', () => {
            //   table.records[2778].TalentStatus = '1010110';
            //   expect(table.records[2778].TalentStatus).to.equal('1010110');

            //   table.recalculateEmptyRecordReferences();
            //   expect(table.records[2778].isEmpty).to.be.true;
            // });
        });

        // describe('LeagueSetting', () => {
        //   before((done) => {
        //     table = file.getTableByName('LeagueSetting');
        //     table.readRecords(['SkillLevel']).then(() => {
        //       done();
        //     });
        //   });

        //   it('can set a negative enum attribute', () => {
        //     let record = table.records[0];

        //     record.SkillLevel = 'Invalid_';
        //     expect(record.SkillLevel).to.equal('INVALID_');
        //     expect(record.getFieldByKey('SkillLevel').unformattedValue).to.equal('1001');
        //   });
        // });

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
