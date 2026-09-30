import path, { dirname } from 'path';
import { expect } from 'chai';
import FranchiseFile from '../../src/FranchiseFile.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePaths = {
    compressed: {
        ftc: 'tests/data/FTC_COMPRESS.FTC',
        m22: 'tests/data/M22_FTC_COMPRESS.FTC',
        tuning: 'tests/data/M22_TUNING_COMPRESS.FTC',
        generator: 'tests/data/M26_GENERATOR_DATA.FTC'
    },
    uncompressed: {
        ftc: 'tests/data/FTC_UNCOMPRESS',
        m22: 'tests/data/M22_FTC_UNCOMPRESS.frt'
    },
    saveTest: {
        ftc: 'tests/data/CAREER-TESTSAVE'
    }
};

let file, tuningFile;

describe('Madden 22 FTC end to end tests', function () {
    this.timeout(7000);

    describe('post-open tests', () => {
        before(async () => {
            file = new FranchiseFile(filePaths.compressed.m22, {
                schemaDirectory: path.join(__dirname, '../data/test-schemas')
            });

            const franchiseFTCPromise = await new Promise((resolve) => {
                file.on('ready', () => {
                    resolve();
                });
            });

            tuningFile = new FranchiseFile(filePaths.compressed.tuning, {
                schemaDirectory: path.join(__dirname, '../data/test-schemas')
            });

            const tuningPromise = await new Promise((resolve) => {
                tuningFile.on('ready', () => {
                    resolve();
                });
            });

            await Promise.all([franchiseFTCPromise, tuningPromise]);
        });

        describe('general', () => {
            it('picks the correct schema', () => {
                expect(file.schemaList.meta.major).to.equal(328);
                expect(file.schemaList.meta.minor).to.equal(1);
            });
        });

        describe('Team', () => {
            let table;
            const tableId = 7482;

            before(async () => {
                table = file.getTableById(tableId);
                await table.readRecords();
            });

            it('can change a table2 value properly', async () => {
                // in this case, the FTC table is storing table2 data in NON-COMPACT form.
                const oldTableTotalLength = table.header.tableTotalLength;
                const oldTable2Length = table.header.table2Length;
                const nextRecordValue = table.records[1].DisplayName;
                const nextRecordOldOffset =
                    table.records[1].fields.DisplayName.secondTableField.index;

                const newRecordValue = 'testnamechange';

                table.records[0].DisplayName = newRecordValue;
                expect(table.records[0].DisplayName).to.equal(newRecordValue);
                expect(table.records[1].DisplayName).to.equal(nextRecordValue);

                await file.save(filePaths.saveTest.ftc);

                let file2 = new FranchiseFile(filePaths.saveTest.ftc);
                await new Promise((resolve) => {
                    file2.on('ready', () => {
                        resolve();
                    });
                });

                const table2 = file2.getTableById(tableId);
                await table2.readRecords();

                expect(table2.records[0].DisplayName).to.equal(newRecordValue);
                expect(table2.records[1].DisplayName).to.equal(nextRecordValue);
                expect(table2.header.table2Length).to.equal(oldTable2Length);
                expect(table2.header.tableTotalLength).to.equal(
                    oldTableTotalLength
                );

                // check that the table2 offset updated correctly in all places
                const expectedOffset = nextRecordOldOffset;
                expect(
                    table.records[1].fields.DisplayName.secondTableField.index
                ).to.equal(expectedOffset);
                expect(
                    table.records[1].fields.DisplayName.secondTableField.offset
                ).to.equal(expectedOffset);
                expect(
                    table.records[1].fields.DisplayName.unformattedValue.getBits(
                        table.records[1].fields.DisplayName.offset.offset,
                        32
                    )
                ).to.equal(expectedOffset);

                expect(
                    table2.records[1].fields.DisplayName.secondTableField.index
                ).to.equal(expectedOffset);
                expect(
                    table2.records[1].fields.DisplayName.secondTableField.offset
                ).to.equal(expectedOffset);
                expect(
                    table2.records[1].fields.DisplayName.unformattedValue.getBits(
                        table2.records[1].fields.DisplayName.offset.offset,
                        32
                    )
                ).to.equal(expectedOffset);
            });

            it('doesnt duplicate changed tables', async () => {
                table.records[0].DisplayName = 'testnamechangeagain';
                await file.save(filePaths.saveTest.ftc);

                let file2 = new FranchiseFile(filePaths.saveTest.ftc);
                await new Promise((resolve) => {
                    file2.on('ready', () => {
                        resolve();
                    });
                });

                expect(file.tables.length).to.eql(file2.tables.length);
            });
        });

        describe('Tuning dash issue', () => {
            it('can edit ScoutTierEnumTableEntry fields', async () => {
                const tableId = 825;

                let table = tuningFile.getTableById(tableId);
                await table.readRecords();

                table.records[2].ShortName = 'TestTest';
                expect(table.records[3].ShortName).to.equal('-');

                await tuningFile.save(filePaths.saveTest.ftc);

                let file2 = new FranchiseFile(filePaths.saveTest.ftc, {
                    schemaDirectory: path.join(
                        __dirname,
                        '../data/test-schemas'
                    )
                });

                await new Promise((resolve) => {
                    file2.on('ready', () => {
                        resolve();
                    });
                });

                let table2 = file2.getTableById(tableId);
                await table2.readRecords();

                expect(table2.records[2].ShortName).to.equal('TestTest');
                expect(table2.records[3].ShortName).to.equal('-');
            });

            it('table2 capacity header is modified as expected', async () => {
                const tableId = 543;

                let table = tuningFile.getTableById(tableId);
                await table.readRecords();

                const oldCapacity = table.header.table2Capacity;
                const oldTotalLength = table.header.tableTotalLength;

                expect(table.header.hasCompactTable2).to.be.true;
                expect(table.header.table2Capacity).to.equal(
                    table.header.table2Length
                );

                const newValue = `${table.records[16].ShortName}Test`;
                const nextRecordShortName = table.records[17].ShortName;
                const nextRecordOldOffset =
                    table.records[17].fields.ShortName.secondTableField.index;

                table.records[16].ShortName = newValue;
                await tuningFile.save(filePaths.saveTest.ftc);

                const newLength = oldCapacity + 4;
                expect(table.header.table2Capacity).to.equal(newLength);
                expect(table.header.table2Length).to.equal(newLength);
                expect(table.header.tableTotalLength).to.equal(oldTotalLength);

                expect(
                    table.data.readUInt32BE(table.header.offsetStart - 44)
                ).to.equal(newLength); // table2Length
                expect(
                    table.data.readUInt32BE(table.header.offsetStart - 24)
                ).to.equal(oldTotalLength); // tableTotalLength
                expect(table.data.readUInt32BE(0x88)).to.equal(newLength); // tableCapacity

                expect(table.records[16].ShortName).to.equal(newValue);
                expect(table.records[17].ShortName).to.equal(
                    nextRecordShortName
                );

                const expectedOffset = nextRecordOldOffset + 4;
                // index & offset are the same value
                expect(
                    table.records[17].fields.ShortName.secondTableField.index
                ).to.equal(expectedOffset);
                expect(
                    table.records[17].fields.ShortName.secondTableField.offset
                ).to.equal(expectedOffset);
                expect(
                    table.records[17].fields.ShortName.unformattedValue.getBits(
                        table.records[17].fields.ShortName.offset.offset,
                        32
                    )
                ).to.equal(expectedOffset);

                const file2 = await FranchiseFile.create(
                    filePaths.saveTest.ftc,
                    {
                        schemaDirectory: path.join(
                            __dirname,
                            '../data/test-schemas'
                        )
                    }
                );

                const table2 = file2.getTableById(tableId);
                await table2.readRecords();

                expect(table2.records[16].ShortName).to.equal(newValue);
                expect(table2.records[17].ShortName).to.equal(
                    nextRecordShortName
                );
                expect(
                    table2.records[17].fields.ShortName.secondTableField.index
                ).to.equal(expectedOffset);
                expect(
                    table2.records[17].fields.ShortName.secondTableField.offset
                ).to.equal(expectedOffset);
                expect(
                    table2.records[17].fields.ShortName.unformattedValue.getBits(
                        table2.records[17].fields.ShortName.offset.offset,
                        32
                    )
                ).to.equal(expectedOffset);
            });

            it('can un-empty a compact table2 field', async () => {
                // protect original file with autosave
                const pristineFile = await FranchiseFile.create(
                    filePaths.compressed.generator
                );
                await pristineFile.save(filePaths.saveTest.ftc);
                const workingFile = await FranchiseFile.create(
                    filePaths.saveTest.ftc,
                    {
                        autoUnempty: true,
                        saveOnChange: true,
                        schemaDirectory: path.join(
                            __dirname,
                            '../data/test-schemas'
                        )
                    }
                );

                let table = workingFile.getTableByName('FixedValue');
                await table.readRecords();
                expect(table.records[9].isEmpty).to.be.true;
                const oldTable2Length = table.header.table2Length;

                table.records[9].Value = 'Test';
                expect(table.records[9].Value).to.equal('Test');
                expect(table.records[9].isEmpty).to.be.false;

                expect(
                    table.records[9].fields.Value.secondTableField.index
                ).to.equal(oldTable2Length);
                expect(
                    table.records[9].fields.Value.secondTableField.offset
                ).to.equal(oldTable2Length);

                await workingFile.save();

                const file2 = await FranchiseFile.create(
                    filePaths.saveTest.ftc,
                    {
                        schemaDirectory: path.join(
                            __dirname,
                            '../data/test-schemas'
                        )
                    }
                );

                let table2 = file2.getTableByName('FixedValue');
                await table2.readRecords();
                expect(table2.records[9].Value).to.equal('Test');
                expect(table2.records[9].isEmpty).to.equal(false);
                expect(
                    table2.records[9].fields.Value.secondTableField.index
                ).to.equal(oldTable2Length);
                expect(
                    table2.records[9].fields.Value.secondTableField.offset
                ).to.equal(oldTable2Length);
            });

            it('empty table2 fields have null value', async () => {
                const file = await FranchiseFile.create(
                    filePaths.compressed.generator
                );

                const table = file.getTableByName('FixedValue');
                await table.readRecords();
                expect(table.records[9].isEmpty).to.be.true;
                expect(table.records[9].Value).to.be.null;
            });

            it('can empty a table2 field', async () => {
                const file = await FranchiseFile.create(
                    filePaths.compressed.generator
                );

                const table = file.getTableByName('FixedValue');
                await table.readRecords();

                const emptyRecordsCount = table.emptyRecords.size;

                expect(table.records[8].isEmpty).to.be.false;

                table.records[8].empty();
                expect(table.records[8].isEmpty).to.be.true;
                expect(table.emptyRecords.size).to.equal(emptyRecordsCount + 1);
                expect(table.emptyRecords.get(8).next).to.equal(33);
            });

            it('can make multiple saves on a table2 field', async () => {
                const tableId = 543;

                let table = tuningFile.getTableById(tableId);
                await table.readRecords();

                const record4Value = table.records[4].ShortName;
                const oldRecord4StringOffset =
                    table.records[4].fields.ShortName.secondTableField.offset;

                const oldRecord1Value = table.records[1].ShortName;
                table.records[1].ShortName = 'Modified';
                await tuningFile.save(filePaths.saveTest.ftc);

                const oldRecord3Value = table.records[3].ShortName;
                table.records[3].ShortName = 'Modified';
                await tuningFile.save(filePaths.saveTest.ftc);

                let file2 = new FranchiseFile(filePaths.saveTest.ftc, {
                    schemaDirectory: path.join(
                        __dirname,
                        '../data/test-schemas'
                    )
                });

                await new Promise((resolve) => {
                    file2.on('ready', () => {
                        resolve();
                    });
                });

                const table2 = file2.getTableById(tableId);
                await table2.readRecords();

                expect(table2.records[1].ShortName).to.equal('Modified');
                expect(table2.records[3].ShortName).to.equal('Modified');

                const expectedOffset =
                    oldRecord4StringOffset +
                    (8 - oldRecord1Value.length) +
                    (8 - oldRecord3Value.length);
                expect(
                    table.records[4].fields.ShortName.secondTableField.offset
                ).to.equal(expectedOffset);
                expect(
                    table.records[4].fields.ShortName.unformattedValue.getBits(
                        table.records[4].fields.ShortName.offset.offset,
                        32
                    )
                ).to.equal(expectedOffset);

                expect(
                    table2.records[4].fields.ShortName.unformattedValue.getBits(
                        table2.records[4].fields.ShortName.offset.offset,
                        32
                    )
                ).to.equal(expectedOffset);
                expect(
                    table2.records[4].fields.ShortName.secondTableField.offset
                ).to.equal(expectedOffset);

                expect(table2.records[4].ShortName).to.equal(record4Value);
            });
        });

        describe('can find references correctly', () => {
            it('EnumTableEntry[]', () => {
                const refs = tuningFile.getReferencesToRecord(1871, 0);
                const table = tuningFile.getTableById(507);

                expect(refs.length).to.equal(1);

                expect(refs[0].tableId).to.equal(507);
                expect(refs[0].name).to.equal('EnumTable');
                expect(refs[0].table).to.equal(table);
            });

            it('AwardTypeEnumTableEntry', () => {
                const refs = tuningFile.getReferencesToRecord(575, 21);
                const table = tuningFile.getTableById(1871);

                expect(refs.length).to.equal(1);

                expect(refs[0].tableId).to.equal(1871);
                expect(refs[0].name).to.equal('EnumTableEntry[]');
                expect(refs[0].table).to.equal(table);
            });
        });
    });
});
