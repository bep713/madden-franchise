import fs from 'fs';
import path, { dirname } from 'path';
import { expect } from 'chai';
import FranchiseFile from '../../src/FranchiseFile.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const filePaths = {
    'compressed': {
      'm21': 'tests/data/CAREER-21COMPRESS'
    },
    'uncompressed': {
      'm21': 'tests/data/21UNCOMPRESS.frt'
    },
    'saveTest': {
      'm21': 'tests/data/CAREER-TESTSAVE-21'
    }
};

let file = createNewFranchiseFile(filePaths.compressed.m21);

function createNewFranchiseFile(thePath) {
    return new FranchiseFile(thePath, {
        'autoParse': false,
        'schemaDirectory': path.join(__dirname, '../data/test-schemas')
    });
};

describe('madden franchise performance tests', function () {
    this.timeout(7000);

    let testIndex = 0;
    let memoryBefore;

    before(async () => {
        memoryBefore = getHeapInMB();
        console.time('parse');
        
        await file.parse();

        if (!file.isLoaded) {
            await new Promise((resolve) => {
                file.on('ready', () => {
                    resolve();
                });
            });
        }

        console.timeEnd('parse');
        
        const memoryAfter = getHeapInMB();
        const memoryUsedInTest = (memoryAfter - memoryBefore).toFixed(2);
        console.log(`Parse used approximately ${memoryUsedInTest} MB\n`);
    });

    beforeEach(() => {
        memoryBefore = getHeapInMB();
        console.log(`====================================\nTest${testIndex}`);
        console.time(testIndex);
    });

    afterEach(() => {
        console.timeEnd(testIndex);
        testIndex += 1;

        const memoryAfter = getHeapInMB();
        const memoryUsedInTest = (memoryAfter - memoryBefore).toFixed(2);
        console.log(`Test used approximately ${memoryUsedInTest} MB\n`);
    });

    describe('control test', () => {
        it('control 1', () => {
            let buffer = fs.readFileSync(filePaths.compressed.m21);
            let fields = [];

            class Record {
                constructor(buffer) {
                    this._buffer = buffer;
                }
            };

            class Field {
                constructor(buf) {
                    this._buf = buf;
                    this._test = 'test';
                }
            };


            for (let i = 0; i < 4000; i++) {
                let record = new Record(buffer);

                for (let j = 0; j < 330; j++) {
                    record[j] = new Field();
                    // record[j] = new Field();
                    // let value = null;

                    // if (j % 7 === 0) {
                    //     value = 'Test';
                    // }
                    // else {
                    //     value = 10 * 5 * j;
                    // }

                    // record[j] = {
                    //     buffer: buffer.slice(0, 1),
                    //     test: 'test',
                    //     value: 'test2',
                    //     value2: 'tst3',
                    //     value3: 'test',
                    //     value4: 10,
                    //     value5: 15
                    // }
                }

                fields.push(record);
            }

            console.log(buffer.buffer);
        });
    });

    describe('read records', () => {
        it('small table', async () => {
            const overallPercentage = file.getTableById(4097);
            await overallPercentage.readRecords();
        });
    
        it('large table', async () => {
            const player = file.getTableById(4226);
            await player.readRecords();
        });
    });

    describe('get and set', () => {
        let table;

        describe('small table', () => {
            before(() => {
                table = file.getTableById(4097);
            });

            it('get from record', () => {
                table.records[0].PercentageSpline;
            });
    
            it('get from field explicitly', () => {
                table.records[0].fields.PercentageSpline.value;
            });
        });

        describe('large table', () => {
            before(() => {
                table = file.getTableById(4226);
            });

            it('get from record', () => {
                table.records[0].CareerStats;
            });
    
            it('get from field explicitly', () => {
                table.records[0].CareerStats.value;
            });
        });
    });

    describe('quick validation', () => {
        
        describe('overall percentage', () => {
            let table;
            before(() => {
                table = file.getTableById(4097);
            });

            it('read', () => {
                console.time('read');
                table.records[0].PlayerPosition;
                console.timeEnd('read');
    
                expect(table.records[0].PlayerPosition).to.equal('CB');
            });

            it('write enum', () => {
                console.time('write');
                table.records[0].PlayerPosition = 'WR';
                console.timeEnd('write');

                expect(table.records[0].PlayerPosition).to.equal('WR');
            });
        });

        describe('player', () => {
            let table;
            before(() => {
                table = file.getTableById(4226);
            });

            it('write string', () => {
                console.time('write');
                table.records[20].FirstName = 'Test';
                console.timeEnd('write');

                expect(table.records[20].FirstName).to.equal('Test');
            }); 
        });
    });

    async function createFranchiseFileAndEnsureReady(path) {
        let file = createNewFranchiseFile(path);
        await file.parse();
        
        await new Promise((resolve) => {
            file.on('ready', () => {
                resolve();
            });
        });

        return file;
    };

    it('use case #1 - "export"', async () => {
        file = await createFranchiseFileAndEnsureReady(filePaths.compressed.m21);

        const player = file.getTableById(4226);

        console.time('read records');
        await player.readRecords();
        console.timeEnd('read records');

        console.time('get all record values');
        player.records.map((record) => {
            return record.fieldsArray.map((field) => {
                return field.value;
            });
        });
        console.timeEnd('get all record values');
    });

    it('use case #2 - "editor"', async () => {
        file = await createFranchiseFileAndEnsureReady(filePaths.compressed.m21);

        const player = file.getTableById(4226);

        console.time('read records');
        await player.readRecords();
        console.timeEnd('read records');

        console.time('get all record values');
        player.records.map((record) => {
            return record.fieldsArray.map((field) => {
                return field.value;
            });
        });
        console.timeEnd('get all record values');

        console.time('get all record values again');
        player.records.map((record) => {
            return record.fieldsArray.map((field) => {
                return field.value;
            });
        });
        console.timeEnd('get all record values again');
    });

    it('use case #3 - "script"', async () => {
        file = await createFranchiseFileAndEnsureReady(filePaths.compressed.m21);

        const player = file.getTableById(4226);

        console.time('read records');
        await player.readRecords();
        console.timeEnd('read records');

        console.time('read 5 records, 10 fields each');
        player.records.slice(5, 10).map((record) => {
            return {
                0: record._fields.FirstName,
                1: record._fields.LastName,
                2: record._fields.GameStats,
                3: record._fields.MetaMorph_CalfsBarycentric,
                4: record._fields.PLYR_BREATHERITE,
                5: record._fields.OriginalImpactBlockRating,
                6: record._fields.CarryingRating,
                7: record._fields.College,
                8: record._fields.SuperBowlWins,
                9: record._fields.ContractSalary4
            };
        });
        console.timeEnd('read 5 records, 10 fields each')

        const team = file.getTableById(7708);
        
        console.time('read second table');
        await team.readRecords();
        console.timeEnd('read second table');

        console.time('write to 5 records, 10 fields each');
        team.records.slice(0, 5).forEach((record) => {
            record._fields.Roster = '00111100001100000000000000000000';
            record._fields.HeadTrainer = '00100000011011100000000000010100';
            record._fields.CurrentBalance = 500;
            record._fields.UniformAssetName = 'TestTeam';
            record._fields.LongName = 'LongoDoggo';
            record._fields.TEAM_LOCKED = false;
            record._fields.TEAM_GOALPOST = 5;
            record._fields.PlayoffRoundReached = 'DivisionChampionship';
            record._fields.TEAM_RATINGDEF = 77;
            record._fields.PrestigeDisplay = 'B-';
        });
        console.timeEnd('write to 5 records, 10 fields each');
    });
});

function getHeapInMB() {
    return process.memoryUsage().heapUsed / 1024 / 1024;
};