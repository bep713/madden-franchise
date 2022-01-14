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

let file;

describe('Madden 20 FTC end to end tests', function () {
    this.timeout(7000);

    describe('post-open tests', () => {
        before((done) => {
            file = new FranchiseFile(filePaths.compressed.m22, {
                'schemaDirectory': path.join(__dirname, '../data/test-schemas')
            });
    
            file.on('ready', () => {
                done();
            });
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
                const newRecordValue = 'testnamechange';

                table.records[0].DisplayName = newRecordValue;

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
            });
        });

        describe('Tuning dash issue', () => {
            let tuningFile;

            before(async () => {
                tuningFile = new FranchiseFile(filePaths.compressed.tuning, {
                    'schemaDirectory': path.join(__dirname, '../data/test-schemas')
                });

                await new Promise((resolve) => {
                    tuningFile.on('ready', () => {
                        resolve();
                    });
                });
            });

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
        });
    });
});