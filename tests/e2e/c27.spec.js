import fs from 'fs';
import zlib from 'zlib';
import path, { dirname } from 'path';
import { expect } from 'chai';
import { BitView } from 'bit-buffer';
import FranchiseFile from '../../src/FranchiseFile.js';
import FranchiseFileTable from '../../src/FranchiseFileTable.js';
import filePaths from '../util/filePathUtil.js';
import { fileURLToPath } from 'url';
import { IsonProcessor } from '../../src/services/isonProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePathToUse = filePaths.compressed.c27;
const filePathToSave = filePaths.saveTest.c27;

let file;

const playerTableId = 4244;
const playerArrayTableIdToTest = 6119;

describe('College Football 27 end to end tests', function () {
    describe('open files', () => {
        it('can open a C27 compressed file', () => {
            file = new FranchiseFile(filePathToUse);
        });

        it('can open a C27 uncompressed file', () => {
            file = new FranchiseFile(filePaths.uncompressed.c27);
        });

        it('fires the `ready` event when the file is done processing', (done) => {
            file = new FranchiseFile(filePathToUse, {
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
                    gameYearOverride: null,
                    gameTypeOverride: null
                });

                expect(file.isLoaded).to.be.true;
                expect(file.filePath).to.eql(filePathToUse);
                expect(file.gameYear).to.equal(27);
                expect(file.rawContents).to.not.be.undefined;
                expect(file.packedFileContents).to.not.be.undefined;
                expect(file.unpackedFileContents).to.not.be.undefined;

                expect(file.tables).to.not.be.undefined;
                expect(file.schemaList).to.not.be.undefined;
                expect(file.schemaList.meta.major).to.equal(468);
                expect(file.schemaList.meta.minor).to.equal(2);
                expect(file.schemaList.path).to.contain('C27_468_2.gz');

                done();
            });
        });
    });

    describe('post-open tests', () => {
        before(async () => {
            file = await FranchiseFile.create(filePathToUse, {
                schemaDirectory: path.join(__dirname, '../data/test-schemas')
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
                expect(file.assetTable.length).to.eql(1507);
            });

            it('first asset entry is correct', () => {
                expect(file.assetTable[0]).to.eql({
                    assetId: 0x8063263c,
                    reference: 0x219e0000
                });
            });

            it('last asset entry is correct', () => {
                expect(file.assetTable[file.assetTable.length - 1]).to.eql({
                    assetId: 0x98d0e7bf,
                    reference: 0x31200063
                });
            });

            it('can retrieve reference information from an asset id', () => {
                const result = file.getReferenceFromAssetId(0x8063263c);
                expect(result).to.eql({
                    tableId: 4303,
                    rowNumber: 0
                });
            });
        });

        describe('can save', () => {
            it('can save without any changes', (done) => {
                file.save(filePathToSave).then(() => {
                    let file2 = new FranchiseFile(filePathToSave);
                    file2.on('ready', () => {
                        expect(file.unpackedFileContents).to.eql(
                            file2.unpackedFileContents
                        );
                        done();
                    });
                });
            });

            it('can save with changes', (done) => {
                let table = file.getTableByName('SkillSlider');
                table.readRecords().then(() => {
                    table.records[0].RunBlocking = 69;

                    file.save(filePathToSave).then(() => {
                        let file2 = new FranchiseFile(filePathToSave);
                        file2.on('ready', () => {
                            expect(file.unpackedFileContents).to.eql(
                                file2.unpackedFileContents
                            );

                            let table2 = file2.getTableByName('SkillSlider');
                            table2.readRecords().then(() => {
                                expect(table2.records[0].RunBlocking).to.equal(
                                    69
                                );
                                table.records[0].RunBlocking = 85;
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

                    file.save(filePathToSave).then(() => {
                        console.timeEnd('actual save call');
                        console.time('read file');
                        let file2 = new FranchiseFile(filePathToSave);

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

            it('can save a table2 field containing a non-utf8 character without data loss', (done) => {
                let table = file.getTableByName('TeamSetting');
                console.time('read records 1');

                table.readRecords('VisitAssistanceDescription').then(() => {
                    console.timeEnd('read records 1');

                    const originalValue =
                        table.records[0].VisitAssistanceDescription;
                    const modifiedValue = originalValue.replace(
                        'Cloud',
                        'Dloud'
                    );

                    console.time('set value');
                    table.records[0].VisitAssistanceDescription = modifiedValue;
                    console.timeEnd('set value');

                    console.time('actual save call');

                    file.save(filePathToSave).then(() => {
                        console.timeEnd('actual save call');
                        console.time('read file');
                        let file2 = new FranchiseFile(filePathToSave);

                        file2.on('ready', () => {
                            console.timeEnd('read file');
                            let table2 = file2.getTableByName('TeamSetting');
                            console.time('read records 2');

                            table2
                                .readRecords('VisitAssistanceDescription')
                                .then(() => {
                                    console.timeEnd('read records 2');
                                    expect(
                                        table2.records[0]
                                            .VisitAssistanceDescription
                                    ).to.equal(modifiedValue);

                                    // Ensure adjacent table2 field hasn't been impacted
                                    expect(
                                        table2.records[1]
                                            .VisitAssistanceDescription
                                    ).to.equal(originalValue);
                                    done();
                                });
                        });
                    });
                });
            });

            it('can save a table2 field ending with a non-utf8 character with complete truncation', (done) => {
                let table = file.getTableByName('Player');
                console.time('read records 1');
                table.readRecords(['LastName']).then(() => {
                    console.timeEnd('read records 1');
                    console.time('set value');
                    table.records[20].LastName =
                        'Allen™™™™™™™™™™™™™™™™™™™™™™™™™™™™™™™™™™™™™™™™™™';
                    console.timeEnd('set value');

                    console.time('actual save call');
                    file.save(filePathToSave).then(() => {
                        console.timeEnd('actual save call');
                        console.time('read file');
                        let file2 = new FranchiseFile(filePathToSave);

                        file2.on('ready', () => {
                            console.timeEnd('read file');
                            let table2 = file2.getTableByName('Player');
                            console.time('read records 2');

                            table2.readRecords(['LastName']).then(() => {
                                console.timeEnd('read records 2');
                                expect(table2.records[20].LastName).to.equal(
                                    'Allen™™™™™'
                                );
                                done();
                            });
                        });
                    });
                });
            });

            it('can save a table2 field and a normal field together', (done) => {
                let division = file.getTableByUniqueId(3621557236);
                let skillSliderTable = file.getTableByName('SkillSlider');
                let playerArray = file.getTableById(playerArrayTableIdToTest);

                let promises = [
                    division.readRecords(),
                    skillSliderTable.readRecords(),
                    playerArray.readRecords()
                ];

                Promise.all(promises).then(() => {
                    division.records[4].Name = 'Test Test';
                    skillSliderTable.records[1].RunBlocking = 90;
                    let control = playerArray.records[0].Player2;

                    file.save(filePathToSave).then(() => {
                        let file2 = new FranchiseFile(filePathToSave);

                        file2.on('ready', () => {
                            division = file2.getTableByUniqueId(3621557236);
                            skillSliderTable =
                                file2.getTableByName('SkillSlider');
                            let playerArray2 = file.getTableById(
                                playerArrayTableIdToTest
                            );

                            promises = [
                                division.readRecords(),
                                skillSliderTable.readRecords(),
                                playerArray2.readRecords()
                            ];

                            Promise.all(promises).then(() => {
                                expect(division.records[4].Name).to.equal(
                                    'Test Test'
                                );
                                expect(
                                    skillSliderTable.records[1].RunBlocking
                                ).to.equal(90);
                                expect(
                                    playerArray2.records[0].Player2
                                ).to.equal(control);
                                done();
                            });
                        });
                    });
                });
            });

            it('can save a table2 field and a normal field together with partial fields', (done) => {
                let division = file.getTableByUniqueId(3621557236);
                let skillSliderTable = file.getTableByName('SkillSlider');
                let playerArray = file.getTableById(playerArrayTableIdToTest);

                let promises = [
                    division.readRecords(['Name']),
                    skillSliderTable.readRecords(['RunBlocking']),
                    playerArray.readRecords()
                ];

                Promise.all(promises).then(() => {
                    division.records[4].Name = 'Test Test';
                    skillSliderTable.records[1].RunBlocking = 90;
                    let control = playerArray.records[0].Player2;

                    file.save(filePathToSave).then(() => {
                        let file2 = new FranchiseFile(filePathToSave);

                        file2.on('ready', () => {
                            division = file2.getTableByUniqueId(3621557236);
                            skillSliderTable =
                                file2.getTableByName('SkillSlider');
                            let playerArray2 = file.getTableById(
                                playerArrayTableIdToTest
                            );

                            promises = [
                                division.readRecords(),
                                skillSliderTable.readRecords(),
                                playerArray2.readRecords()
                            ];

                            Promise.all(promises).then(() => {
                                expect(division.records[4].Name).to.equal(
                                    'Test Test'
                                );
                                expect(
                                    skillSliderTable.records[1].RunBlocking
                                ).to.equal(90);
                                expect(
                                    playerArray2.records[0].Player2
                                ).to.equal(control);
                                done();
                            });
                        });
                    });
                });
            });

            it('can save a table2 field and an array field together', (done) => {
                let division = file.getTableByUniqueId(3621557236);
                let skillSliderTable = file.getTableByName('SkillSlider');
                let playerArray = file.getTableById(playerArrayTableIdToTest);

                let promises = [
                    division.readRecords(),
                    skillSliderTable.readRecords(),
                    playerArray.readRecords()
                ];

                Promise.all(promises).then(() => {
                    division.records[4].Name = 'Test Test';
                    let playerArrayOriginalRef = playerArray.records[0].Player0;
                    playerArray.records[0].Player0 =
                        '00100000011101100000010001111011';
                    let control = skillSliderTable.records[1].RunBlocking;

                    file.save(filePathToSave).then(() => {
                        let file2 = new FranchiseFile(filePathToSave);

                        file2.on('ready', () => {
                            division = file2.getTableByUniqueId(3621557236);
                            skillSliderTable =
                                file2.getTableByName('SkillSlider');
                            let playerArray2 = file.getTableById(
                                playerArrayTableIdToTest
                            );

                            promises = [
                                division.readRecords(),
                                skillSliderTable.readRecords(),
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
                                    skillSliderTable.records[1].RunBlocking
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
                let division = file.getTableByUniqueId(3621557236);
                let skillSliderTable = file.getTableByName('SkillSlider');
                let playerArray = file.getTableById(playerArrayTableIdToTest);

                let promises = [
                    division.readRecords(),
                    skillSliderTable.readRecords(),
                    playerArray.readRecords()
                ];

                Promise.all(promises).then(() => {
                    skillSliderTable.records[1].RunBlocking = 85;
                    let playerArrayOriginalRef = playerArray.records[0].Player0;
                    playerArray.records[0].Player0 =
                        '00111111111101100000010001111011';
                    let control = division.records[4].Name;

                    file.save(filePathToSave).then(() => {
                        let file2 = new FranchiseFile(filePathToSave);

                        file2.on('ready', () => {
                            division = file2.getTableByUniqueId(3621557236);
                            skillSliderTable =
                                file2.getTableByName('SkillSlider');
                            let playerArray2 = file.getTableById(
                                playerArrayTableIdToTest
                            );

                            promises = [
                                division.readRecords(),
                                skillSliderTable.readRecords(),
                                playerArray2.readRecords()
                            ];

                            Promise.all(promises).then(() => {
                                expect(
                                    skillSliderTable.records[1].RunBlocking
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
                let division = file.getTableByUniqueId(3621557236);

                let promises = [division.readRecords()];

                Promise.all(promises).then(() => {
                    division.records[0].PresentationId = 5;

                    let weeklyTip = file.getTableByName('WeeklyTip');
                    weeklyTip.readRecords().then(() => {
                        weeklyTip.records[10].Title = 'The Test Bowl';

                        file.save(filePathToSave).then(() => {
                            let file2 = new FranchiseFile(filePathToSave);

                            file2.on('ready', () => {
                                division = file2.getTableByUniqueId(3621557236);
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
                    expect(table.offset).to.equal(4403677);
                });

                it('parsed expected header', () => {
                    expect(table.header).to.not.be.undefined;
                    expect(table.header.tableId).to.equal(4201);
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
                        '00100000110100100000000000000110'
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
                        expect(table.emptyRecords.size).to.equal(256);
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
                                expect(record.LocalPopularity).to.equal(0);
                                expect(record.NationalPopularity).to.equal(0);
                                expect(record.RegionalPopularity).to.equal(1);
                            });

                            it('getValueByKey()', () => {
                                expect(
                                    record.getValueByKey('LocalPopularity')
                                ).to.equal(0);
                                expect(
                                    record.getValueByKey('NationalPopularity')
                                ).to.equal(0);
                                expect(
                                    record.getValueByKey('RegionalPopularity')
                                ).to.equal(1);
                            });

                            it('getFieldByKey()', () => {
                                let localPopField =
                                    record.getFieldByKey('LocalPopularity');
                                expect(localPopField).to.not.be.undefined;
                                expect(localPopField.value).to.equal(0);
                                expect(
                                    localPopField.unformattedValue.getBits(
                                        localPopField.offset.offset,
                                        localPopField.offset.length
                                    )
                                ).to.equal(0);

                                let regionalPopField =
                                    record.getFieldByKey('RegionalPopularity');
                                expect(regionalPopField).to.not.be.undefined;
                                expect(regionalPopField.value).to.equal(1);
                                expect(
                                    regionalPopField.unformattedValue.getBits(
                                        regionalPopField.offset.offset,
                                        regionalPopField.offset.length
                                    )
                                ).to.equal(1);
                            });
                        });

                        describe('second record', () => {
                            let record;

                            beforeEach(() => {
                                record = table.records[1];
                            });

                            it('has expected values', () => {
                                expect(record.LocalPopularity).to.equal(0);
                                expect(record.NationalPopularity).to.equal(0);
                                expect(record.RegionalPopularity).to.equal(2);
                            });

                            it('has expected unformatted values', () => {
                                expect(
                                    record.fields[
                                        'LocalPopularity'
                                    ].unformattedValue.getBits(0, 18)
                                ).to.equal(0);
                                expect(
                                    record.fields[
                                        'NationalPopularity'
                                    ].unformattedValue.getBits(18, 7)
                                ).to.equal(0);
                                expect(
                                    record.fields[
                                        'RegionalPopularity'
                                    ].unformattedValue.getBits(25, 7)
                                ).to.equal(2);
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

                        before(() => {
                            record = table.records[0];

                            // un-empty the 1st record
                            record.LocalPopularity = 85;
                            record.NationalPopularity = 70;
                            record.RegionalPopularity = 40;
                        });

                        it('emptying a record where there is already one or more empty records', () => {
                            // This table is 4 bytes long so we can do this safely
                            const firstRecordValue = table.data.readUInt32BE(
                                table.header.table1StartIndex + 4
                            );

                            expect(record.isEmpty).to.be.false;

                            record.empty();

                            expect(record.isEmpty).to.be.true;
                            expect(table.emptyRecords.size).to.equal(256);
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

                            expect(record.isEmpty).to.be.true;
                            expect(table.emptyRecords.size).to.equal(256);
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
                        it('filling an empty record with autoUnempty disabled - changing first 4 bytes should unempty anyway', () => {
                            file.settings.autoUnempty = false;

                            expect(table.records[253].isEmpty).to.be.true;

                            table.records[253].LocalPopularity = 20;
                            table.records[253].NationalPopularity = 23;
                            table.records[253].RegionalPopularity = 25;

                            expect(table.records[253].isEmpty).to.be.false;

                            expect(table.emptyRecords.size).to.equal(255);
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

                        it('filling a record when there is already one or more empty records', () => {
                            file.settings.autoUnempty = true;
                            expect(table.records[254].isEmpty).to.be.true;

                            table.records[254].LocalPopularity = 20;
                            table.records[254].NationalPopularity = 23;
                            table.records[254].RegionalPopularity = 25;

                            expect(table.records[254].isEmpty).to.be.false;

                            expect(table.emptyRecords.size).to.equal(254);
                            expect(table.emptyRecords.get(252)).to.eql({
                                previous: 251,
                                next: 255
                            });
                            expect(table.emptyRecords.get(255)).to.eql({
                                previous: 252,
                                next: 0
                            });

                            expect(
                                table.data.readUInt32BE(
                                    table.header.table1StartIndex + 252 * 4
                                )
                            ).to.equal(255);
                            expect(
                                table.records[252].data.readUInt32BE(0)
                            ).to.equal(255);
                        });

                        it('filling a record when there is already one or more empty records - last record', () => {
                            file.settings.autoUnempty = true;
                            table.records[0].LocalPopularity = 20;
                            table.records[0].NationalPopularity = 23;
                            table.records[0].RegionalPopularity = 25;

                            expect(table.emptyRecords.size).to.equal(253);
                            expect(table.emptyRecords.get(255)).to.eql({
                                previous: 252,
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
                    table = file.getTableById(playerArrayTableIdToTest);
                });

                it('table exists', () => {
                    expect(table).to.not.be.undefined;
                    expect(table).to.be.instanceOf(FranchiseFileTable);
                });

                it('parses expected attribute values', () => {
                    expect(table.isArray).to.be.true;
                    expect(table.isChanged).to.be.false;
                    expect(table.recordsRead).to.be.true;
                    expect(table.data).to.not.be.undefined;
                    expect(table.hexData).to.not.be.undefined;
                    expect(table.readRecords).to.exist;
                    expect(table.offset).to.equal(25636345);
                });

                it('parsed expected header', () => {
                    expect(table.header).to.not.be.undefined;
                    expect(table.header.tableId).to.equal(6119);
                    expect(table.header.data1RecordCount).to.equal(5005);
                    expect(table.header.record1Size).to.equal(24);
                    expect(table.header.headerSize).to.equal(252);
                    expect(table.header.hasSecondTable).to.be.false;
                    expect(table.header.table1StartIndex).to.equal(20272);
                    expect(table.header.table1Length).to.equal(140172);
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
                        expect(table.offsetTable.length).to.equal(6);

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
                        expect(table.arraySizes.length).to.equal(5005);
                        expect(table.arraySizes[0]).to.equal(3);
                    });

                    it('parses array sizes correctly - multiple rows', async () => {
                        expect(table.arraySizes[0]).to.equal(3);
                        expect(table.arraySizes[14]).to.equal(3);
                        expect(table.arraySizes[19]).to.equal(5);
                    });

                    it('reads records correctly', () => {
                        expect(table.records.length).to.equal(5005);
                        expect(table.recordsRead).to.be.true;

                        let record = table.records[0];
                        expect(record.Player0).to.eql(
                            '00100001001010000000000011000110'
                        );
                        expect(record.Player1).to.eql(
                            '00100001001010000000101010101010'
                        );
                        expect(record.Player2).to.eql(
                            '00100001001010000000100100100010'
                        );
                        expect(record.hexData.slice(0, 10)).to.eql(
                            Buffer.from([
                                0x21, 0x28, 0x00, 0xc6, 0x21, 0x28, 0x0a, 0xaa,
                                0x21, 0x28
                            ])
                        );
                    });

                    it('saves records correctly', (done) => {
                        table.records[0].Player0 =
                            '00100000011101100000010001111011';
                        file.save(filePathToSave).then(() => {
                            let file2 = new FranchiseFile(filePathToSave);
                            file2.on('ready', () => {
                                let table2 = file2.getTableById(
                                    playerArrayTableIdToTest
                                );
                                table2.readRecords().then(() => {
                                    expect(table2.records[0].Player0).to.eql(
                                        '00100000011101100000010001111011'
                                    );
                                    expect(table2.records[0].Player1).to.eql(
                                        '00100001001010000000101010101010'
                                    );
                                    expect(table2.records[0].Player3).to.eql(
                                        '00000000000000000000000000000000'
                                    );
                                    done();
                                });
                            });
                        });
                    });

                    it('allows users to modify array length', (done) => {
                        let newTable = file.getTableById(
                            playerArrayTableIdToTest
                        );

                        newTable.readRecords().then(() => {
                            expect(newTable.arraySizes.length).to.equal(
                                newTable.header.data1RecordCount
                            );
                            expect(newTable.arraySizes[0]).to.equal(3);

                            newTable.records[0].Player3 =
                                '00100000011101100000010001111011';
                            expect(newTable.arraySizes[0]).to.equal(4);

                            file.save(filePathToSave).then(() => {
                                let file2 = new FranchiseFile(filePathToSave);

                                file2.on('ready', () => {
                                    let table2 = file2.getTableById(
                                        playerArrayTableIdToTest
                                    );

                                    table2.readRecords().then(() => {
                                        expect(table2.arraySizes[0]).to.equal(
                                            4
                                        );
                                        expect(
                                            table2.records[0].Player0
                                        ).to.eql(
                                            '00100000011101100000010001111011'
                                        );
                                        expect(
                                            table2.records[0].Player1
                                        ).to.eql(
                                            '00100001001010000000101010101010'
                                        );
                                        expect(
                                            table2.records[0].Player2
                                        ).to.eql(
                                            '00100001001010000000100100100010'
                                        );
                                        expect(
                                            table2.records[0].Player3
                                        ).to.eql(
                                            '00100000011101100000010001111011'
                                        );
                                        done();
                                    });
                                });
                            });
                        });
                    });

                    it('allows users to modify array length - array size starts at 0', (done) => {
                        let newTable = file.getTableById(
                            playerArrayTableIdToTest
                        );

                        newTable.readRecords().then(() => {
                            newTable.arraySizes[0] = 0;
                            newTable.records[0].arraySize = 0;
                            newTable.records[0].Player4 =
                                '00100000011101100000010001111011';
                            expect(newTable.arraySizes[0]).to.equal(5);
                            done();
                        });
                    });

                    it('allows users to modify array length - multiple rows', (done) => {
                        let newTable = file.getTableById(
                            playerArrayTableIdToTest
                        );

                        newTable.readRecords().then(() => {
                            expect(newTable.arraySizes.length).to.equal(
                                newTable.header.data1RecordCount
                            );
                            expect(newTable.arraySizes[17]).to.equal(3);
                            expect(newTable.arraySizes[26]).to.equal(3);

                            newTable.records[17].Player4 =
                                '00100000011101100000010001111011';
                            newTable.records[26].Player5 =
                                '00100000011101100000010001111011';
                            expect(newTable.arraySizes[17]).to.equal(5);
                            expect(newTable.arraySizes[26]).to.equal(6);

                            file.save(filePathToSave).then(() => {
                                let file2 = new FranchiseFile(filePathToSave);

                                file2.on('ready', () => {
                                    let table2 = file2.getTableById(
                                        playerArrayTableIdToTest
                                    );

                                    table2.readRecords().then(() => {
                                        expect(table2.arraySizes[17]).to.equal(
                                            5
                                        );
                                        expect(table2.arraySizes[26]).to.equal(
                                            6
                                        );

                                        expect(
                                            table2.records[17].Player4
                                        ).to.eql(
                                            '00100000011101100000010001111011'
                                        );
                                        expect(
                                            table2.records[26].Player5
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
            const tableId = playerArrayTableIdToTest;

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
                        '00000000000000000001001110001101';
                    table.recalculateEmptyRecordReferences();

                    expect(table.emptyRecords.size).to.equal(1);
                    expect(table.emptyRecords.get(19)).to.eql({
                        previous: null,
                        next: 5005
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
            const playerIndex = 6744;

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
                expect(table.offset).to.equal(11871480);
            });

            it('parsed expected header', () => {
                expect(table.header).to.not.be.undefined;
                expect(table.header.tableId).to.equal(playerTableId);
                expect(table.header.data1RecordCount).to.equal(16500);
                expect(table.header.record1Size).to.equal(192);
                expect(table.header.headerSize).to.equal(1384);
                expect(table.header.hasSecondTable).to.be.true;
                expect(table.header.table1StartIndex).to.equal(1384);
                expect(table.header.table1Length).to.equal(3169184);
                expect(table.header.table2StartIndex).to.equal(3169384);
                expect(table.header.table2Length).to.equal(2277000);
            });

            it('has correct schema', () => {
                expect(table.schema).to.not.be.undefined;
                expect(table.schema.attributes.length).to.equal(288);
                expect(table.schema.attributes[0].name).to.equal(
                    'IsUserControlled'
                );
                expect(table.schema.attributes[1].name).to.equal(
                    'CharacterGameplay'
                );
                expect(table.schema.attributes[2].name).to.equal(
                    'IronManPosition'
                );
                expect(table.schema.attributes[104].name).to.equal(
                    'WearAndTear_LFoot'
                );
            });

            describe('reads records that are passed in', () => {
                beforeEach((done) => {
                    table
                        .readRecords([
                            'FirstName',
                            'LastName',
                            'Position',
                            'PT_BIGHITTER',
                            'SeasonStats',
                            'InjuryType',
                            'PT_COVERBALL'
                        ])
                        .then(() => {
                            done();
                        });
                });

                it('has expected offset table', () => {
                    expect(table.loadedOffsets.length).to.equal(7);
                    expect(table.offsetTable.length).to.equal(282);

                    let seasonStatsOffset = table.offsetTable[3];
                    expect(seasonStatsOffset.name).to.equal('SeasonStats');
                    expect(seasonStatsOffset.isReference).to.be.true;
                    expect(seasonStatsOffset.originalIndex).to.equal(233);
                    expect(seasonStatsOffset.index).to.equal(253);
                    expect(seasonStatsOffset.offset).to.equal(96);
                    expect(seasonStatsOffset.indexOffset).to.equal(96);
                    expect(seasonStatsOffset.length).to.equal(32);

                    let assetNameOffset = table.offsetTable[6];
                    expect(assetNameOffset.name).to.equal('PLYR_ASSETNAME');
                    expect(assetNameOffset.isReference).to.be.false;
                    expect(assetNameOffset.originalIndex).to.equal(96);
                    expect(assetNameOffset.index).to.equal(213);
                    expect(assetNameOffset.offset).to.equal(192);
                    expect(assetNameOffset.indexOffset).to.equal(192);
                    expect(assetNameOffset.length).to.equal(32);

                    let runningStyleOffset = table.offsetTable[147];
                    expect(runningStyleOffset.name).to.equal(
                        'RunningStyleRating'
                    );
                    expect(runningStyleOffset.isReference).to.be.false;
                    expect(runningStyleOffset.originalIndex).to.equal(228);
                    expect(runningStyleOffset.index).to.equal(250);
                    expect(runningStyleOffset.offset).to.equal(1287);
                    expect(runningStyleOffset.indexOffset).to.equal(1300);
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
                            '00000000000000000000000000000000'
                        );
                        expect(record.FirstName).to.equal('Omar');
                        expect(record.LastName).to.equal('Aarons');
                        expect(record.Position).to.equal('WR');
                        expect(record.PT_BIGHITTER).to.equal(false);
                        expect(record.InjuryType).to.equal('Invalid_');
                    });

                    it('Arch Manning', () => {
                        let record = table.records[playerIndex];
                        expect(record.GameStats).to.be.null;
                        expect(record.SeasonStats).to.equal(
                            '00000000000000000000000000000000'
                        );
                        expect(record.FirstName).to.equal('Arch');
                        expect(record.LastName).to.equal('Manning');
                        expect(record.Position).to.equal('QB');
                        expect(record.PT_BIGHITTER).to.equal(false);
                    });

                    it('Arch Manning - table2 field (First Name)', () => {
                        let record = table.records[playerIndex];
                        const field =
                            record.getFieldByKey('FirstName').secondTableField;

                        expect(field).to.not.be.undefined;
                        expect(field.index).to.equal(930672);
                        expect(field.maxLength).to.equal(17);
                        expect(field.value).to.equal('Arch');
                        expect(field.unformattedValue.length).to.equal(17);
                        expect(field.unformattedValue).to.eql(
                            Buffer.from([
                                65, 114, 99, 104, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                                0, 0, 0
                            ])
                        );
                    });
                });

                it('can set a Player record to empty', () => {
                    let record = table.records[5];
                    record.empty();
                });

                it('"autoUnempty: false" will not un-empty the row if an empty player row is edited', () => {
                    file.settings.autoUnempty = false;
                    let record = table.records[table.header.nextRecordToUse];

                    expect(record.isEmpty).to.be.true;
                    const valueBefore = record.SeasonStats;

                    record.FirstName = 'NotEmpty';
                    expect(record.isEmpty).to.be.true;
                    expect(record.SeasonStats).to.equal(valueBefore); // should not clear out the first 4 bytes
                });

                it('"autoUnempty: true" will un-empty the row if an empty player row is edited', () => {
                    let record = table.records[table.header.nextRecordToUse];

                    expect(record.isEmpty).to.be.true;
                    record.FirstName = 'NotEmpty';
                    expect(record.isEmpty).to.be.false;
                    expect(record.SeasonStats).to.equal(
                        '00000000000000000000000000000000'
                    ); // should clear out the first 4 bytes
                });
            });

            describe('can reload the table if new attributes to load are passed', () => {
                it('will re-read records if new attributes are passed in', (done) => {
                    table
                        .readRecords(['GameStats'])
                        .then(() => {
                            expect(table.records[0].GameStats).to.not.be
                                .undefined;
                            expect(table.loadedOffsets.length).to.equal(8);
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

                it('can change a name', () => {
                    let record = table.records[playerIndex];
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
                    let record = table.records[playerIndex];

                    expect(() => {
                        record.getFieldByKey('FirstName').unformattedValue =
                            '30101010101';
                    }).to.throw(Error);
                });

                it('wont allow invalid reference values if setting value either', () => {
                    let record = table.records[playerIndex];

                    expect(() => {
                        record.GameStats = '222010101';
                    }).to.throw(Error);
                });

                it('can set an integer field with a string', () => {
                    let record = table.records[playerIndex];
                    record.CarryingRating = '50';
                    expect(record.CarryingRating).to.equal(50);
                });
            });
        });

        describe('Injury_AttributeModifier', () => {
            let table;
            const tableUniqueId = 4243555669;
            before(async () => {
                table = file.getTableByUniqueId(tableUniqueId);
                await table.readRecords();
            });

            it('can parse a float value', () => {
                expect(table.records[8].Value).to.equal(0.8500000238418579);
                expect(table.records[9].Value).to.equal(0.949999988079071);
            });

            it('can edit a float value', async () => {
                const editedValue = 9.021;
                table.records[8].Value = editedValue;
                expect(table.records[8].Value).to.equal(editedValue);

                await file.save(filePathToSave);

                const file2 = await FranchiseFile.create(filePathToSave);
                const table2 = file2.getTableByUniqueId(tableUniqueId);
                await table2.readRecords();

                expect(table.records[8].Value).to.equal(editedValue);
                expect(table.records[9].Value).to.equal(0.949999988079071);
            });
        });

        describe('RegularSeasonEndReaction', () => {
            let table;
            beforeEach(() => {
                table = file.getTableByUniqueId(1217016781);
            });

            it('table exists', () => {
                expect(table).to.not.be.undefined;
                expect(table).to.be.instanceOf(FranchiseFileTable);
                expect(table.name).to.equal('RegularSeasonEndReaction');
            });

            it('parses expected attribute values', () => {
                expect(table.isArray).to.be.false;
                expect(table.isChanged).to.be.false;
                expect(table.recordsRead).to.be.false;
                expect(table.data).to.not.be.undefined;
                expect(table.hexData).to.not.be.undefined;
                expect(table.readRecords).to.exist;
                expect(table.offset).to.equal(19572574);
            });

            it('parsed expected header', () => {
                expect(table.header).to.not.be.undefined;
                expect(table.header.tableId).to.equal(4321);
                expect(table.header.data1RecordCount).to.equal(3);
                expect(table.header.record1Size).to.equal(60);
                expect(table.header.headerSize).to.equal(292);
                expect(table.header.hasSecondTable).to.be.false;
                expect(table.header.table1StartIndex).to.equal(292);
                expect(table.header.table1Length).to.equal(272);
            });

            it('has correct schema', () => {
                expect(table.schema).to.not.be.undefined;
                expect(table.schema.attributes.length).to.equal(15);
                expect(table.schema.attributes[0].name).to.equal('EventRecord');
                expect(table.schema.attributes[1].name).to.equal('Handle');
                expect(table.schema.attributes[2].name).to.equal('AwardsEval');
                expect(table.schema.attributes[3].name).to.equal(
                    'CoachRetirementEval'
                );
            });

            describe('reads records that are passed in', () => {
                before((done) => {
                    table.readRecords().then(() => {
                        done();
                    });
                });

                it('has expected offset table', () => {
                    expect(table.loadedOffsets.length).to.equal(14);
                    expect(table.offsetTable.length).to.equal(14);

                    let offset0 = table.offsetTable[0];
                    expect(offset0.name).to.equal('UpdateEndOfSeasonStats');
                    expect(offset0.isReference).to.be.true;
                    expect(offset0.originalIndex).to.equal(14);
                    expect(offset0.index).to.equal(14);
                    expect(offset0.offset).to.equal(0);
                    expect(offset0.indexOffset).to.equal(0);
                    expect(offset0.length).to.equal(32);

                    let offset5 = table.offsetTable[5];
                    expect(offset5.name).to.equal('PlayerProgressionEval');

                    let offset6 = table.offsetTable[6];
                    expect(offset6.name).to.equal('PlayerManager');
                });
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
                        next: 22
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
                    ).to.equal(22);

                    // Updates record buffer to reflect change
                    expect(table.records[9].data.readUInt32BE(0)).to.equal(22);
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
                        next: 22
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
                    ).to.equal(22);

                    // Updates table buffer of previous empty record to reflect change
                    expect(
                        table.data.readUInt32BE(
                            table.header.table1StartIndex +
                                9 * table.header.record1Size
                        )
                    ).to.equal(6);

                    // Updates record buffer to reflect change
                    expect(table.records[6].data.readUInt32BE(0)).to.equal(22);

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
                        next: 22
                    });

                    // Next record to use should now be updated to 6.
                    expect(table.header.nextRecordToUse).to.equal(6);

                    // Buffer should be updated to 6 as well.
                    expect(
                        table.data.readUInt32BE(table.header.headerOffset - 4)
                    ).to.equal(6);
                });

                it('can fill all empty records', () => {
                    table.records[6].PercentageSpline =
                        '10000000000000000000000000000011';

                    // Adds empty record to map
                    expect(table.emptyRecords.size).to.equal(0);

                    // Next record to use should now be updated to 22.
                    expect(table.header.nextRecordToUse).to.equal(22);

                    // Buffer should be updated to 22 as well.
                    expect(
                        table.data.readUInt32BE(table.header.headerOffset - 4)
                    ).to.equal(22);
                });

                it('can manually set the next record to use in the header', async () => {
                    table.records[10].PercentageSpline =
                        '00000000000000000000000000010110';
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
                    await file.save(filePathToSave);

                    let file2 = new FranchiseFile(filePathToSave);

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
                        '00000000000000000000000000010110';
                    table.setNextRecordToUse(5, true);

                    // Adds empty record to map
                    expect(table.emptyRecords.size).to.equal(2);
                    expect(table.emptyRecords.get(5)).to.eql({
                        previous: null,
                        next: 6
                    });
                    expect(table.emptyRecords.get(6)).to.eql({
                        previous: 5,
                        next: 22
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
                            next: 22
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
                        await file.save(filePathToSave);

                        let file2 = new FranchiseFile(filePathToSave);

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
                            next: 22
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
                        expect(table.header.nextRecordToUse).to.equal(22);

                        // Buffer should be updated to 7 as well.
                        expect(
                            table.data.readUInt32BE(
                                table.header.headerOffset - 4
                            )
                        ).to.equal(22);
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
                table = file.getTableByUniqueId(3359508968);
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
                table = file.getTableById(5160);
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
            const intArrayTableId = 4706;

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
                expect(table.records[0].int0).to.equal(54);
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

                file.save(filePathToSave).then(() => {
                    let file2 = new FranchiseFile(filePathToSave);
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
            const tableId = 5997;

            before(async () => {
                table = file.getTableById(tableId);
                await table.readRecords();
            });

            it('recognizes type `record` as a reference', () => {
                expect(table.records[0].fieldsArray[0].isReference).to.be.true;
            });

            it('contains correct reference', () => {
                expect(table.records[0].getReferenceDataByKey('WR')).to.eql({
                    tableId: 4146,
                    rowNumber: 0
                });
            });
        });

        describe('can follow references', () => {
            it('can follow reference data correctly', () => {
                const playerArrayTable = file.getTableById(
                    playerArrayTableIdToTest
                );
                let record = playerArrayTable.records[0];

                const result = file.getReferencedRecord(record.Player1);
                const expectedResult =
                    file.getTableById(playerTableId).records[2730];

                expect(result.data).to.eql(expectedResult.data);
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
            const tweetTableId = 4323;

            before(async () => {
                table = file.getTableById(tweetTableId);
                await table.readRecords();
            });

            it('can set two table2 fields that exist in the file in inverse order', async () => {
                table.records[0].AuthorName = 'Test';
                table.records[0].ImageData = 'It works';
                table.records[0].TweetHash = 333535142;
                table.records[0].Tweet =
                    "As of this week, there's NFL action to watch EVERY SINGLE WEEK until February! :fire: ";

                expect(table.records[0].AuthorName).to.equal('Test');
                expect(table.records[0].ImageData).to.equal('It works');

                await file.save(filePathToSave);

                let file2 = new FranchiseFile(filePathToSave);

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
                    expect(table.emptyRecords.size).to.equal(100);

                    expect(table.records[0].TweetHash).to.equal(333535142);
                    expect(table.records[0].Tweet).to.equal(
                        "As of this week, there's NFL action to watch EVERY SINGLE WEEK until February! :fire: "
                    );
                    expect(table.records[0].AuthorName).to.equal('Test');
                });

                it('can replace with modified data', async () => {
                    const modifiedData = fs.readFileSync(
                        path.join(
                            __dirname,
                            '../data/table-import/c27_TweetTableModified.dat'
                        )
                    );
                    await table.replaceRawData(modifiedData, true);

                    expect(table.recordsRead).to.be.true;
                    expect(table.records.length).to.equal(101);
                    expect(table.table2Records.length).to.equal(303);
                    expect(table.emptyRecords.size).to.equal(100);

                    expect(table.header.tableId).to.equal(tweetTableId);
                    expect(table.records[2].TweetHash).to.equal(1);
                    expect(table.records[2].Tweet).to.equal('Jesus, Tony');
                    expect(table.records[2].AuthorName).to.equal(
                        'Baker Mayfield'
                    );
                });

                it('modified data is saved properly', async () => {
                    await file.save(filePathToSave);

                    let file2 = new FranchiseFile(filePathToSave);
                    await new Promise((resolve) => {
                        file2.on('ready', () => {
                            resolve();
                        });
                    });

                    const table = file2.getTableById(tweetTableId);
                    expect(table).to.exist;

                    await table.readRecords();
                    expect(table.header.tableId).to.equal(tweetTableId);
                    expect(table.records[2].TweetHash).to.equal(1);
                    expect(table.records[2].Tweet).to.equal('Jesus, Tony');
                    expect(table.records[2].AuthorName).to.equal(
                        'Baker Mayfield'
                    );
                });
            });
        });

        describe('can get references to a specific record', () => {
            it('expected result', () => {
                const references = file.getReferencesToRecord(5160, 0);
                const overallPercentageTable = file.getTableById(4097);

                expect(references.length).to.equal(2);
                expect(references[0].tableId).to.eql(4097);
                expect(references[0].name).to.eql('OverallPercentage');
                expect(references[0].table).to.eql(overallPercentageTable);
            });

            it('expected result - Team', () => {
                const references = file.getReferencesToRecord(6334, 0);

                const gameOStatsTable = file.getTableById(4110);
                const teamArrayTable = file.getTableById(5303);

                expect(references.length).to.equal(32);

                expect(references[0].tableId).to.eql(4110);
                expect(references[0].name).to.eql('GameOffensiveStats');
                expect(references[0].table).to.eql(gameOStatsTable);

                expect(references[21].tableId).to.eql(5303);
                expect(references[21].name).to.eql('Team[]');
                expect(references[21].table).to.eql(teamArrayTable);
            });

            it('expected result - FranchiseUser', () => {
                // FranchiseUser is referenced with generic type `record` in some tables
                const references = file.getReferencesToRecord(4333, 0);
                expect(references.length).to.equal(8);
            });
        });

        describe('last table', () => {
            let table;
            const lastTableId = 6380;

            before(async () => {
                table = file.getTableById(lastTableId);
                await table.readRecords();
            });

            it('trailing 8 bytes of file is not included in data', () => {
                expect(table.data.length).to.equal(264);
            });
        });

        describe('TeamNeedEvaluation', () => {
            let table;
            const tableId = 4109;

            before(async () => {
                table = file.getTableById(tableId);
                await table.readRecords();
            });

            it('correctly identifies first empty record', () => {
                expect(table.header.nextRecordToUse).to.equal(0);
            });

            it('recognizes record as not empty after editing first column', () => {
                table.records[0].Depth = 1;

                expect(table.records[0].isEmpty).to.be.false;
                expect(table.header.nextRecordToUse).to.equal(1);
            });

            it('does not zero out the first 32 bits since changed field is part of first 32 bytes', () => {
                // each record is only 4 bytes long
                table.records[1].Severity = 1;
                expect(table.records[1].data.readUInt32BE(0)).to.be.greaterThan(
                    0
                );
            });

            it('recognizes record as not empty after editing last column', () => {
                table.records[2].Depth = 25;
                expect(table.header.nextRecordToUse).to.equal(3);
            });

            it('will not clear out values changed if first column was edited before last column', () => {
                table.records[3].Depth; // caching values
                table.records[3].Severity; // caching values

                table.records[3].Depth = 1;
                table.records[3].Severity = 25;

                expect(table.records[3].isEmpty).to.be.false;
                expect(table.records[3].Depth).to.equal(1); // check that value persists
                expect(table.records[3].Severity).to.equal(25); // check that value persists
            });
        });

        describe('Coach', () => {
            let table;
            const coachUniqueId = 1860529246;

            before(async () => {
                table = file.getTableByUniqueId(coachUniqueId);
                await table.readRecords();
            });

            it('external table reference should remain intact as the user entered it', async () => {
                table.records[0].DefensivePlaybook =
                    '10000000000000011001100000100000';
                expect(table.records[0].DefensivePlaybook).to.equal(
                    '10000000000000011001100000100000'
                );

                // Save test
                await file.save(filePathToSave);

                let file2 = new FranchiseFile(filePathToSave);

                let readyPromise = new Promise((resolve) => {
                    file2.on('ready', () => {
                        resolve();
                    });
                });

                await readyPromise;

                let table2 = file2.getTableByUniqueId(coachUniqueId);
                await table2.readRecords();

                expect(table2.records[0].DefensivePlaybook).to.equal(
                    '10000000000000011001100000100000'
                );
            });

            it('changing a table2 value should mark the entire row as not empty', () => {
                table.records[497].FirstName = 'Test';
                expect(table.records[497].isEmpty).to.be.false;
            });

            it('changing an empty table2 value will reset the table2 offsets for that record', async () => {
                table.records[497].FirstName = 'Test';

                // first string in first record stays at offset 0
                expect(
                    table.records[0]._fields.FirstName.secondTableField.offset
                ).to.equal(0);

                // previously empty row points to its allocated table2 bytes (non-FTC files allocate bytes for empty rows)
                expect(
                    table.records[497]._fields.FirstName.secondTableField.offset
                ).to.equal(64610);
                expect(
                    table.records[497]._fields.LastName.secondTableField.offset
                ).to.equal(64627);
                expect(
                    table.records[497]._fields.AssetName.secondTableField.offset
                ).to.not.equal(0);
                expect(
                    table.records[497]._fields.Name.secondTableField.offset
                ).to.not.equal(0);
            });

            it("changing an empty table2 value will un-empty the row and zero out the first 4 bytes if the field isn't part of it", () => {
                table.records[497].FirstName = 'Test';

                expect(table.records[497].data.readUInt32BE(0)).to.equal(0);
                const recordStartIndex =
                    table.header.table1StartIndex +
                    497 * table.header.record1Size;
                expect(table.data.readUInt32BE(recordStartIndex)).to.equal(0);
            });

            it("when the first 4 bytes are zeroed out, the first column's value changes as well", () => {
                let value = table.records[498].DefensivePlaybook; // read the 1st column value first so its cached

                table.records[498].FirstName = 'Test';
                expect(value).to.not.equal('00000000000000000000000000000000');
                expect(table.records[498].DefensivePlaybook).to.equal(
                    '00000000000000000000000000000000'
                );
            });

            it('changing an empty table2 value will persist the new values and new offsets', async () => {
                const firstRowFirstName = table.records[0].FirstName;

                table.records[498].FirstName = 'Test1';
                expect(table.records[498].FirstName).to.equal('Test1');

                // Save test
                await file.save(filePathToSave);

                let file2 = new FranchiseFile(filePathToSave);

                let readyPromise = new Promise((resolve) => {
                    file2.on('ready', () => {
                        resolve();
                    });
                });

                await readyPromise;

                let table2 = file2.getTableByUniqueId(coachUniqueId);
                await table2.readRecords();

                expect(table2.records[0].FirstName).to.equal(firstRowFirstName);
                expect(table2.records[498].FirstName).to.equal('Test1');

                expect(
                    table.records[497]._fields.FirstName.secondTableField.offset
                ).to.equal(64610);
                expect(
                    table.records[497]._fields.LastName.secondTableField.offset
                ).to.equal(64627);
                expect(
                    table.records[137]._fields.AssetName.secondTableField.offset
                ).to.not.equal(0);
                expect(
                    table.records[137]._fields.Name.secondTableField.offset
                ).to.not.equal(0);
            });

            it('if a field in the first 4 bytes is changed, it should not get zeroed out', () => {
                table.records[499].DefensivePlaybook =
                    '10000000000000001110101110010111';
                expect(table.records[499].DefensivePlaybook).to.equal(
                    '10000000000000001110101110010111'
                );

                expect(table.records[500].DefensivePlaybook).to.not.equal(
                    '10000000000000001110101110010111'
                );
                table.records[500].FirstName = 'Test';
                table.records[500].DefensivePlaybook =
                    '10000000000000001110101110010111';
                expect(table.records[500].DefensivePlaybook).to.equal(
                    '10000000000000001110101110010111'
                );
            });

            it('can recalculate empty references after un-emptying a row', () => {
                table.records[505].DefensivePlaybook =
                    '10000000000000001110101110010111';
                table.recalculateEmptyRecordReferences();
                expect(table.emptyRecords.get(506)).to.eql({
                    previous: 504,
                    next: 507
                });

                expect(table.emptyRecords.get(497)).to.eql(undefined); // un-emptied in a test above
                expect(table.emptyRecords.get(498)).to.eql(undefined); // un-emptied in a test above
                expect(table.emptyRecords.get(499)).to.eql(undefined); // un-emptied in a test above
                expect(table.emptyRecords.get(500)).to.eql(undefined); // un-emptied in a test above

                expect(table.emptyRecords.get(501)).to.eql({
                    previous: null,
                    next: 502
                });
            });

            it('field isChanged attribute is reset after saving', async () => {
                table.records[498].FirstName = 'Test2';
                expect(table.records[498]._fieldsArray[19].isChanged).to.be
                    .true;

                // Save test
                await file.save(filePathToSave);

                expect(table.records[498]._fieldsArray[19].isChanged).to.be
                    .false;
            });

            it('can set the value of an empty record enum - autoUnempty: true', () => {
                expect(table.records[501].isEmpty).to.be.true;
                table.records[501].Personality = 'Intense';
                expect(table.records[501].Personality).to.equal('Intense');
                expect(table.records[501].isEmpty).to.be.false;
            });

            it('can set the value of an enum to an empty record reference', () => {
                table.records[502].Personality = '1010110';
                expect(table.records[502].Personality).to.equal('1010110');
                expect(table.records[502].isEmpty).to.be.false;
            });
        });

        describe('CharacterVisuals (table3)', () => {
            let table;
            const characterVisualsUniqueId = 1429178382;

            before(async () => {
                table = file.getTableByUniqueId(characterVisualsUniqueId);
                await table.readRecords();
            });

            it('populates table3 attributes in header', () => {
                expect(table.header.table3Length).to.equal(6032000);
                expect(table.header.hasThirdTable).to.be.true;
                expect(table.header.table3StartIndex).to.equal(128240);
            });

            it('populates offset flag correctly', () => {
                expect(table.offsetTable[1].valueInThirdTable).to.be.true;
            });

            it('populates table3 records', () => {
                expect(table.table3Records.length).to.equal(16000);
            });

            it('can get the uncompressed JSON data from the field', () => {
                const data = table.records[0].RawData;
                expect(data[0]).to.equal('{');
                expect(data.length).to.equal(2215);
            });

            it('can get the table3 record from the field', () => {
                const thirdTableField =
                    table.records[0]._fields.RawData.thirdTableField;
                const data = thirdTableField.value;
                expect(data[0]).to.equal('{');
                expect(data.length).to.equal(2215);
            });

            it('can parse the table3 record as JSON', () => {
                let existingData = JSON.parse(table.records[0].RawData);
                expect(existingData.loadouts.length).to.equal(1);
                expect(existingData.loadouts[0].loadoutCategory).to.equal(
                    'GearOnly'
                );
                expect(
                    existingData.loadouts[0].loadoutElements.length
                ).to.equal(31);
            });

            it('can get the table3 unformatted data', () => {
                const thirdTableField =
                    table.records[0]._fields.RawData.thirdTableField;
                const data = thirdTableField.unformattedValue;
                expect(data.length).to.equal(377);
                expect(data.readUInt16LE(0)).to.equal(77); // size of gzipped data in first 2 bytes
                expect(data.readUInt32BE(2)).to.equal(0x28b52ffd); // zstd signature
            });

            it('can set the table3 data', () => {
                let existingData = JSON.parse(table.records[0].RawData);
                existingData.skinTone = 1;
                existingData.loadouts[0].loadoutCategory = 'CoachTest';

                table.records[0].RawData = JSON.stringify(existingData);

                expect(table.records[0].RawData).to.eql(
                    JSON.stringify(existingData)
                );
                expect(
                    table.records[0]._fields.RawData.thirdTableField.value
                ).to.eql(JSON.stringify(existingData));
            });

            it('can set the table3 data without JSON.stringify', () => {
                let existingData = JSON.parse(table.records[0].RawData);
                existingData.skinTone = 1;
                existingData.loadouts[0].loadoutCategory = 'CoachTest';

                table.records[0].RawData = existingData;

                expect(table.records[0].RawData).to.eql(
                    JSON.stringify(existingData)
                );
                expect(
                    table.records[0]._fields.RawData.thirdTableField.value
                ).to.eql(JSON.stringify(existingData));
            });

            it('populates unformatted value correctly after setting the value', () => {
                let existingData = JSON.parse(table.records[0].RawData);
                existingData.skinTone = 1;
                existingData.loadouts[0].loadoutCategory = 'CoachTest';

                table.records[0].RawData = existingData;

                expect(
                    table.records[0]._fields.RawData.thirdTableField
                        .unformattedValue
                ).to.be.an.instanceOf(Buffer);
                expect(
                    table.records[0]._fields.RawData.thirdTableField
                        .unformattedValue.length
                ).to.equal(377);

                const dictBuf = fs.readFileSync(
                    path.join(__dirname, '../../data/zstd-dicts/c27/dict.bin')
                );

                const length =
                    table.records[0]._fields.RawData.thirdTableField.unformattedValue.readUInt16LE(
                        0
                    );

                const data = zlib.zstdDecompressSync(
                    table.records[0]._fields.RawData.thirdTableField.unformattedValue.subarray(
                        2,
                        length + 2
                    ),
                    { dictionary: dictBuf }
                );

                expect(
                    new IsonProcessor(27, 'college').isonVisualsToJson(data)
                ).to.eql(existingData);
            });

            it('saves properly after edit', (done) => {
                let existingData = JSON.parse(table.records[0].RawData);
                existingData.skinTone = 1;
                existingData.loadouts[0].loadoutCategory = 'CoachTest';

                table.records[0].RawData = existingData;
                file.save(filePathToSave).then(() => {
                    let file2 = new FranchiseFile(filePathToSave);
                    file2.on('ready', async () => {
                        let table2 = file2.getTableByUniqueId(
                            characterVisualsUniqueId
                        );
                        await table2.readRecords();

                        expect(table2.records[0].RawData).to.eql(
                            JSON.stringify(existingData)
                        );
                        done();
                    });
                });
            });

            it('handles empty scenario', () => {
                const prevData = table.records[0].RawData;
                table.records[0].empty();
                expect(table.records[0].RawData).to.eql(prevData);
                expect(
                    table.records[0]._fields.RawData.thirdTableField.value
                ).to.eql(prevData);
            });

            it('handles un-empty scenario', () => {
                const prevData = table.records[0].RawData;
                const prevUnformatted =
                    table.records[0]._fields.RawData.unformattedValue;

                table.records[0].empty();
                expect(table.records[0].RawData).to.eql(prevData);

                table.records[0].Overflow = '00000000000000000000000000000000';
                expect(table.records[0].RawData).to.eql(prevData);
                expect(
                    table.records[0]._fields.RawData.unformattedValue
                ).to.eql(prevUnformatted);
                expect(
                    table.records[0]._fields.RawData.thirdTableField.value
                ).to.eql(prevData);
            });

            // it('handles un-empty scenario (not manually emptying first)', (done) => {
            //   const recordIndex = 3720;
            //   expect(table.records[recordIndex].isEmpty).to.be.true;

            //   let offsetTableEntry = table.records[recordIndex]._fields.RawData.offset;
            //   const oldOffset1 = table.records[recordIndex]._fields.RawData.unformattedValue.getBits(offsetTableEntry.offset, offsetTableEntry.length);
            //   const oldOffset2 = table.records[recordIndex]._fields.RawData.thirdTableField.offset;

            //   table.records[recordIndex].Overflow = '00000000000000000000000000000000';

            //   const newData = { test: 'Hi' };
            //   table.records[recordIndex].RawData = newData;

            //   expect(table.records[recordIndex].isEmpty).to.be.false;
            //   expect(table.records[recordIndex].RawData).to.eql(JSON.stringify(newData));
            //   expect(table.records[recordIndex]._fields.RawData.unformattedValue.getBits(offsetTableEntry.offset, offsetTableEntry.length)).to.not.equal(oldOffset1);
            //   expect(table.records[recordIndex]._fields.RawData.thirdTableField.offset).to.not.equal(oldOffset2);

            //   file.save(filePathToSave).then(() => {
            //     let file2 = new FranchiseFile(filePathToSave);
            //     file2.on('ready', async () => {
            //       let table2 = file2.getTableById(tableId);
            //       await table2.readRecords();

            //       offsetTableEntry = table2.records[recordIndex]._fields.RawData.offset;

            //       expect(table2.records[recordIndex].isEmpty).to.be.false;
            //       expect(table2.records[recordIndex].RawData).to.eql(JSON.stringify(newData));
            //       expect(table2.records[recordIndex]._fields.RawData.unformattedValue.getBits(offsetTableEntry.offset, offsetTableEntry.length)).to.not.equal(oldOffset1);
            //       expect(table2.records[recordIndex]._fields.RawData.thirdTableField.offset).to.not.equal(oldOffset2);
            //       done();
            //     });
            //   });
            // });

            it('handles scenario where all records change', function (done) {
                this.timeout(7000);
                for (let row = 0; row < table.header.recordCapacity; row++) {
                    table.records[row]['RawData'] = {};
                }

                file.save(filePathToSave).then(() => {
                    let file2 = new FranchiseFile(filePathToSave);
                    file2.on('ready', async () => {
                        let table2 = file2.getTableByUniqueId(
                            characterVisualsUniqueId
                        );
                        await table2.readRecords();

                        for (
                            let row = 0;
                            row < table2.header.recordCapacity;
                            row++
                        ) {
                            expect(table2.records[row]['RawData']).to.eql('{}');
                        }

                        done();
                    });
                });
            });

            it('handles setting larger formatted values', (done) => {
                const newData = JSON.parse(
                    fs.readFileSync(
                        path.join(__dirname, '../data/26LargeVisualsData.json'),
                        'utf8'
                    )
                );

                table.records[0]['RawData'] = newData;

                file.save(filePathToSave).then(() => {
                    let file2 = new FranchiseFile(filePathToSave);
                    file2.on('ready', async () => {
                        let table2 = file2.getTableByUniqueId(
                            characterVisualsUniqueId
                        );
                        await table2.readRecords();

                        expect(table2.records[0]['RawData']).to.eql(
                            JSON.stringify(newData)
                        );

                        done();
                    });
                });
            });

            it('handles reading overflow data', (done) => {
                let file2 = new FranchiseFile(
                    path.join(__dirname, '../data/CAREER-26VISUALSOVERFLOW')
                );
                file2.on('ready', async () => {
                    let table2 = file2.getTableByUniqueId(
                        characterVisualsUniqueId
                    );
                    await table2.readRecords();

                    const visualsData = JSON.parse(
                        table2.records[488]['RawData']
                    );

                    expect(visualsData.loadouts.length).to.not.equal(0);
                    done();
                });
            });

            it('handles saving with overflow data', (done) => {
                let file2 = new FranchiseFile(
                    path.join(__dirname, '../data/CAREER-26VISUALSOVERFLOW')
                );
                file2.on('ready', async () => {
                    let table2 = file2.getTableByUniqueId(
                        characterVisualsUniqueId
                    );
                    await table2.readRecords();
                    const visualsData = JSON.parse(
                        table2.records[488]['RawData']
                    );

                    visualsData.skintone = 3;

                    table2.records[488]['RawData'] = visualsData;

                    file2.save(filePathToSave).then(() => {
                        let file3 = new FranchiseFile(filePathToSave);
                        file3.on('ready', async () => {
                            let table3 = file3.getTableByUniqueId(
                                characterVisualsUniqueId
                            );
                            await table3.readRecords();
                            const visualsData2 = JSON.parse(
                                table3.records[488]['RawData']
                            );
                            expect(visualsData2.skinTone).to.equal(3);
                            done();
                        });
                    });
                });
            });

            it('handles replacing raw table data', (done) => {
                const tableRawData = table.hexData;

                const originalTableLength = tableRawData.length;

                table.replaceRawData(tableRawData).then(() => {
                    file.save(filePathToSave).then(() => {
                        let file2 = new FranchiseFile(filePathToSave);
                        file2.on('ready', async () => {
                            let table2 = file2.getTableByUniqueId(
                                characterVisualsUniqueId
                            );
                            await table2.readRecords();

                            const tableNewRawData = table.hexData;

                            expect(tableNewRawData.length).to.equal(
                                originalTableLength
                            );

                            done();
                        });
                    });
                });
            });

            it('handles reading signed ISON bytes', (done) => {
                let file2 = new FranchiseFile(
                    path.join(__dirname, '../data/DYNASTY-SIGNEDISON')
                );
                file2.on('ready', async () => {
                    let table2 = file2.getTableByUniqueId(
                        characterVisualsUniqueId
                    );
                    await table2.readRecords();

                    const visualsData = JSON.parse(
                        table2.records[10760]['RawData']
                    );

                    expect(visualsData.skinTone).to.equal(-1);

                    done();
                });
            });

            it('handles saving signed ISON bytes', (done) => {
                let file = new FranchiseFile(
                    path.join(__dirname, '../data/DYNASTY-SIGNEDISON')
                );
                file.on('ready', async () => {
                    let table2 = file.getTableByUniqueId(
                        characterVisualsUniqueId
                    );
                    await table2.readRecords();

                    const visualsData = JSON.parse(
                        table2.records[0]['RawData']
                    );

                    visualsData.skinTone = -1;

                    table2.records[0]['RawData'] = visualsData;

                    file.save(filePathToSave).then(() => {
                        let file2 = new FranchiseFile(filePathToSave);
                        file2.on('ready', async () => {
                            let table3 = file2.getTableByUniqueId(
                                characterVisualsUniqueId
                            );
                            await table3.readRecords();
                            const visualsData2 = JSON.parse(
                                table3.records[0]['RawData']
                            );
                            expect(visualsData2.skinTone).to.equal(-1);
                            done();
                        });
                    });
                });
            });
        });

        describe('CharacterGameplay', () => {
            let table;
            const characterGameplayUniqueId = 2615759307;

            before(async () => {
                table = file.getTableByUniqueId(characterGameplayUniqueId);
                await table.readRecords();
            });

            it('parses expected value', () => {
                expect(table.records[0].RawData).to.eql(
                    '{"characterAnimations":{"qbThrowStyle":20,"qbShotgunStance":6,"qbUnderCenterStance":6}}'
                );
            });

            it('correctly detects empty records', () => {
                expect(table.emptyRecords.size).to.equal(37);
                expect(table.emptyRecords.get(539)).to.eql({
                    previous: null,
                    next: 23
                });
            });

            it('gracefully handles reading empty record data', () => {
                expect(table.records[16].isEmpty).to.be.true;
                expect(table.records[23].isEmpty).to.be.true;

                expect(table.records[16].RawData).to.be.null;
                expect(table.records[23].RawData).to.be.null;
            });

            it('handles un-empty scenario', () => {
                // each table3 record is 0x98 (152) bytes long. 152*16 = 2432
                const expectedTable3Offset = 2432;

                expect(table.records[16].isEmpty).to.be.true;
                expect(
                    table.records[16]
                        .getFieldByKey('RawData')
                        .unformattedValue.getBits(0, 32)
                ).to.not.equal(expectedTable3Offset);

                const newData = {
                    characterAnimations: { qbThrowStyle: 31 }
                };

                table.records[16].RawData = newData;

                expect(table.records[16].isEmpty).to.be.false;
                expect(table.records[16].RawData).to.eql(
                    JSON.stringify(newData)
                );

                expect(
                    table.records[16]
                        .getFieldByKey('RawData')
                        .unformattedValue.getBits(0, 32)
                ).to.equal(expectedTable3Offset);
            });
        });
    });
});
