import { expect } from 'chai';
import common from '../../common/common.js';
import FranchiseTableStrategy from '../../../../src/strategies/common/table/FranchiseTableStrategy.js';

describe('Franchise Table Strategy unit tests', () => {
    describe('get table2 binary data', () => {
        it('gives expected result if all fields are parsed', () => {
            const table2Records = [
                {
                    isChanged: false,
                    index: 0,
                    hexData: Buffer.from([0x67, 0x00, 0x00, 0x00, 0x00, 0x00])
                },
                {
                    isChanged: true,
                    index: 6,
                    hexData: Buffer.from([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x00])
                },
                {
                    isChanged: false,
                    index: 12,
                    hexData: Buffer.from([0x74, 0x65, 0x73, 0x74, 0x31, 0x32])
                },
                {
                    isChanged: false,
                    index: 0,
                    hexData: Buffer.from([0x67, 0x00, 0x00, 0x00, 0x00, 0x00])
                }
            ];

            const oldData = Buffer.from([
                0x67, 0x00, 0x00, 0x00, 0x00, 0x00, 0x4f, 0x6c, 0x64, 0x44,
                0x61, 0x74, 0x74, 0x65, 0x73, 0x74, 0x31, 0x32, 0x67, 0x00,
                0x00, 0x00, 0x00, 0x00
            ]);

            const result = FranchiseTableStrategy.getTable2BinaryData(
                table2Records,
                oldData
            );

            const expectedResult = table2Records.reduce((prev, cur) => {
                return Buffer.concat([prev, cur.hexData]);
            }, Buffer.alloc(0));

            common.hashCompare(Buffer.concat(result), expectedResult);
        });

        it('gives expected results if certain fields are omitted', () => {
            const table2Records = [
                {
                    isChanged: false,
                    index: 0,
                    hexData: Buffer.from([0x67, 0x00, 0x00, 0x00, 0x00, 0x00])
                },
                {
                    isChanged: true,
                    index: 6,
                    hexData: Buffer.from([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x00])
                },
                {
                    isChanged: false,
                    index: 18,
                    hexData: Buffer.from([0x74, 0x65, 0x73, 0x74, 0x31, 0x32])
                },
                {
                    isChanged: false,
                    index: 0,
                    hexData: Buffer.from([0x67, 0x00, 0x00, 0x00, 0x00, 0x00])
                }
            ];

            const oldData = Buffer.from([
                0x67, 0x00, 0x00, 0x00, 0x00, 0x00, 0x4f, 0x6c, 0x64, 0x44,
                0x61, 0x74, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x74, 0x65,
                0x73, 0x74, 0x31, 0x32, 0x67, 0x00, 0x00, 0x00, 0x00, 0x00
            ]);

            const expectedResult = Buffer.from([
                0x67, 0x00, 0x00, 0x00, 0x00, 0x00, 0x68, 0x65, 0x6c, 0x6c,
                0x6f, 0x00, 0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x74, 0x65,
                0x73, 0x74, 0x31, 0x32, 0x67, 0x00, 0x00, 0x00, 0x00, 0x00
            ]);

            const result = FranchiseTableStrategy.getTable2BinaryData(
                table2Records,
                oldData
            );

            common.hashCompare(Buffer.concat(result), expectedResult);
        });

        it('preserves original table2 buffer when no string fields were read (table2Records is empty)', () => {
            // This test demonstrates the bug where table2 data is lost when
            // no string fields are read before saving. This happens when
            // modifying only non-string fields (like cap penalties).
            //
            // Bug scenario:
            // 1. Open a franchise file
            // 2. Read only non-string fields (e.g., TeamIndex, ThisYearCapPenalties)
            // 3. Modify those fields and save
            // 4. Re-open the file - string fields return BitView objects instead of strings
            //
            // Root cause: When table2Records.length === 0, the function returned
            // an empty array, losing the original table2 data. On reload,
            // tableTotalLength equals table1Length, so hasSecondTable becomes false,
            // and string fields fall through to return raw BitView objects.

            const table2Records = []; // No string fields were read

            const originalTable2Buffer = Buffer.from([
                0x34, 0x39, 0x65, 0x72, 0x73, 0x00, // "49ers\0"
                0x42, 0x65, 0x61, 0x72, 0x73, 0x00, // "Bears\0"
                0x50, 0x61, 0x63, 0x6b, 0x65, 0x72, 0x73, 0x00 // "Packers\0"
            ]);

            const result = FranchiseTableStrategy.getTable2BinaryData(
                table2Records,
                originalTable2Buffer
            );

            // The original table2 buffer should be preserved, not lost
            const combinedResult = Buffer.concat(result);
            expect(combinedResult.length).to.be.greaterThan(0);
            common.hashCompare(combinedResult, originalTable2Buffer);
        });

        // it('performance test', () => {
        //     let table2RecordsPerformanceTest = [];

        //     for (let i = 0; i < 20000; i++) {
        //         table2RecordsPerformanceTest.push({
        //             'isChanged': false,
        //             'index': 0,
        //             'hexData': Buffer.from([0x74, 0x65, 0x73, 0x74, 0x31, 0x32, 0x74, 0x65, 0x73, 0x74, 0x31, 0x32, 0x74, 0x65, 0x73, 0x74, 0x31, 0x32, 0x74, 0x65, 0x73, 0x74, 0x31, 0x32, 0x00])
        //         });
        //     }

        //     for (let i = 0; i < 5000; i++) {
        //         table2RecordsPerformanceTest.push({
        //             'isChanged': false,
        //             'index': 0,
        //             'hexData': Buffer.from([0x74, 0x65, 0x73, 0x74, 0x31, 0x32, 0x74, 0x65, 0x73, 0x74, 0x31, 0x32, 0x74, 0x65, 0x73, 0x74, 0x31, 0x32, 0x74, 0x65, 0x73, 0x74, 0x31, 0x32, 0x00])
        //         });
        //     }

        //     console.time('getTable2BinaryData');
        //     const perfTestResult = M19TableStrategy.getTable2BinaryData(table2RecordsPerformanceTest);
        //     let test = Buffer.concat(perfTestResult);
        //     console.timeEnd('getTable2BinaryData');
        // });
    });

    describe('returns a list of mandatory offsets', () => {
        it('returns an empty list', () => {
            expect(FranchiseTableStrategy.getMandatoryOffsets()).to.eql([]);
        });
    });

    it('can recalculate string offsets for a given record', () => {
        const table = {
            offsetTable: [
                {
                    index: 0,
                    type: 'string',
                    maxLength: 9
                },
                {
                    index: 2,
                    type: 'string',
                    maxLength: 11
                },
                {
                    index: 1,
                    type: 'string',
                    maxLength: 22
                },
                {
                    index: 3,
                    type: 's_int',
                    maxLength: 7
                },
                {
                    index: 4,
                    type: 'string',
                    maxLength: 6
                }
            ]
        };

        let record = {
            index: 7,
            fieldsArray: [
                {
                    offset: table.offsetTable[0],
                    secondTableField: {
                        offset: 0
                    }
                },
                {
                    offset: table.offsetTable[1],
                    secondTableField: {
                        offset: 0
                    }
                },
                {
                    offset: table.offsetTable[2],
                    secondTableField: {
                        offset: 0
                    }
                },
                {
                    offset: table.offsetTable[3] // not a string field
                },
                {
                    offset: table.offsetTable[4],
                    secondTableField: {
                        offset: 0
                    }
                }
            ]
        };

        FranchiseTableStrategy.recalculateStringOffsets(table, record);

        // each record table2 holds 48 bytes
        // This record index is 7, so 7*48 + (field offset)
        expect(record.fieldsArray[0].secondTableField.offset).to.equal(336);
        expect(record.fieldsArray[1].secondTableField.offset).to.equal(367); // offsets are out of order above
        expect(record.fieldsArray[2].secondTableField.offset).to.equal(345);
        expect(record.fieldsArray[4].secondTableField.offset).to.equal(378);
    });
});
