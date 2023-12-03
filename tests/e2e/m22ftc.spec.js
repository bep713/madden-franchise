const path = require('path');
const expect = require('chai').expect;
const FranchiseFile = require('../../FranchiseFile');
const FranchiseFileTable = require('../../FranchiseFileTable');
const filePaths = {
    'compressed': {
        'ftc': 'tests/data/FTC_COMPRESS.FTC',
        'm22': 'tests/data/M22_FTC_COMPRESS.FTC',
        'tuning': 'tests/data/M22_TUNING_COMPRESS.FTC'
    },
    'uncompressed': {
        'ftc': 'tests/data/FTC_UNCOMPRESS',
        'm22': 'tests/data/M22_FTC_UNCOMPRESS.frt'
    },
    'saveTest': {
        'ftc': 'tests/data/CAREER-TESTSAVE'
    }
};

let file, tuningFile;

describe('Madden 22 FTC end to end tests', function () {
    this.timeout(7000);

    describe('post-open tests', () => {
        before(async () => {
            file = new FranchiseFile(filePaths.compressed.m22, {
                'schemaDirectory': path.join(__dirname, '../data/test-schemas')
            });

            const franchiseFTCPromise = await new Promise((resolve) => {
                file.on('ready', () => {
                    resolve();
                });
            });

            tuningFile = new FranchiseFile(filePaths.compressed.tuning, {
                'schemaDirectory': path.join(__dirname, '../data/test-schemas')
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
                const oldTableTotalLength = table.header.tableTotalLength;
                const oldTable2Length = table.header.table2Length;
                const oldRecordValue = table.records[0].DisplayName;
                const nextRecordValue = table.records[1].DisplayName;
                const nextRecordOldOffset = table.records[1].fields.DisplayName.secondTableField.index;

                const newRecordValue = 'testnamechange';

                table.records[0].DisplayName = newRecordValue;
                expect(table.records[0].DisplayName).to.equal(newRecordValue);
                expect(table.records[1].DisplayName).to.equal(nextRecordValue);

                await file.save(filePaths.saveTest.ftc);

                let file2 = new FranchiseFile(filePaths.saveTest.ftc);
                await new Promise((resolve, reject) => {
                    file2.on('ready', () => {
                        resolve();
                    });
                });

                const table2 = file2.getTableById(tableId);
                await table2.readRecords();

                expect(table2.records[0].DisplayName).to.equal(newRecordValue);
                expect(table2.records[1].DisplayName).to.equal(nextRecordValue);
                expect(table2.header.table2Length).to.equal(oldTable2Length + newRecordValue.length - oldRecordValue.length);
                expect(table2.header.tableTotalLength).to.equal(oldTableTotalLength + newRecordValue.length - oldRecordValue.length);

                // check that the table2 offset updated correctly in all places
                const expectedOffset = nextRecordOldOffset + newRecordValue.length - oldRecordValue.length;
                expect(table.records[1].fields.DisplayName.secondTableField.index).to.equal(expectedOffset);
                expect(table.records[1].fields.DisplayName.secondTableField.offset).to.equal(expectedOffset);
                expect(table.records[1].fields.DisplayName.unformattedValue.getBits(table.records[1].fields.DisplayName.offset.offset, 32)).to.equal(expectedOffset);

                expect(table2.records[1].fields.DisplayName.secondTableField.index).to.equal(expectedOffset);
                expect(table2.records[1].fields.DisplayName.secondTableField.offset).to.equal(expectedOffset);
                expect(table2.records[1].fields.DisplayName.unformattedValue.getBits(table2.records[1].fields.DisplayName.offset.offset, 32)).to.equal(expectedOffset);
            });

            it('doesnt duplicate changed tables', async () => {
                table.records[0].DisplayName = 'testnamechangeagain';
                await file.save(filePaths.saveTest.ftc);

                let file2 = new FranchiseFile(filePaths.saveTest.ftc);
                await new Promise((resolve, reject) => {
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
                    'schemaDirectory': path.join(__dirname, '../data/test-schemas')
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

            it('can make multiple saves on a table2 field', async () => {
                const tableId = 543;

                let table = tuningFile.getTableById(tableId);
                await table.readRecords();

                const record4Value = table.records[4].ShortName;
                const oldRecord4StringOffset = table.records[4].fields.ShortName.secondTableField.offset;

                const oldRecord1Value = table.records[1].ShortName;
                table.records[1].ShortName = 'Modified';
                await tuningFile.save(filePaths.saveTest.ftc);

                const oldRecord3Value = table.records[3].ShortName;
                table.records[3].ShortName = 'Modified';
                await tuningFile.save(filePaths.saveTest.ftc);

                let file2 = new FranchiseFile(filePaths.saveTest.ftc, {
                    'schemaDirectory': path.join(__dirname, '../data/test-schemas')
                });

                await new Promise((resolve, reject) => {
                    file2.on('ready', () => {
                        resolve();
                    });
                });

                const table2 = file2.getTableById(tableId);
                await table2.readRecords();

                expect(table2.records[1].ShortName).to.equal('Modified');
                expect(table2.records[3].ShortName).to.equal('Modified');

                const expectedOffset = oldRecord4StringOffset + (8 - oldRecord1Value.length) + (8 - oldRecord3Value.length);
                expect(table.records[4].fields.ShortName.secondTableField.offset).to.equal(expectedOffset);
                expect(table.records[4].fields.ShortName.unformattedValue.getBits(table.records[4].fields.ShortName.offset.offset, 32)).to.equal(expectedOffset);

                expect(table2.records[4].fields.ShortName.unformattedValue.getBits(table2.records[4].fields.ShortName.offset.offset, 32)).to.equal(expectedOffset);
                expect(table2.records[4].fields.ShortName.secondTableField.offset).to.equal(expectedOffset);

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