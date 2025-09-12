import { expect } from 'chai';
import FTCTableStrategy from '../../../../src/strategies/common/table/FTCTableStrategy.js';

describe('FTC Table Strategy unit tests', () => {
    describe('get table2 binary data', () => {
        it('gives expected result if all fields are parsed', () => {
            const table2Records = [
                {
                    isChanged: false,
                    offset: 0,
                    lengthAtLastSave: 6,
                    hexData: Buffer.from([0x67, 0x00, 0x00, 0x00, 0x00, 0x00])
                },
                {
                    isChanged: true,
                    offset: 6,
                    lengthAtLastSave: 6,
                    hexData: Buffer.from([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x00])
                },
                {
                    isChanged: false,
                    offset: 12,
                    lengthAtLastSave: 6,
                    hexData: Buffer.from([0x74, 0x65, 0x73, 0x74, 0x31, 0x32])
                },
                {
                    isChanged: false,
                    offset: 0,
                    lengthAtLastSave: 6,
                    hexData: Buffer.from([0x67, 0x00, 0x00, 0x00, 0x00, 0x00])
                }
            ];

            const oldData = Buffer.from([
                0x67, 0x00, 0x00, 0x00, 0x00, 0x00, 0x4f, 0x6c, 0x64, 0x44,
                0x61, 0x74, 0x74, 0x65, 0x73, 0x74, 0x31, 0x32
            ]);

            const result = FTCTableStrategy.getTable2BinaryData(
                table2Records,
                oldData
            );

            const expectedResult = [
                Buffer.from([
                    0x67, 0x00, 0x00, 0x00, 0x00, 0x00, 0x68, 0x65, 0x6c, 0x6c,
                    0x6f, 0x00, 0x74, 0x65, 0x73, 0x74, 0x31, 0x32
                ])
            ];

            expect(result).to.eql(expectedResult);
        });

        it('gives expected results if a field is smaller than it originally was', () => {
            const table2Records = [
                {
                    isChanged: false,
                    offset: 0,
                    lengthAtLastSave: 6,
                    hexData: Buffer.from([0x67, 0x00, 0x00, 0x00, 0x00, 0x00])
                },
                {
                    isChanged: true,
                    offset: 6,
                    lengthAtLastSave: 6,
                    hexData: Buffer.from([0x68, 0x65, 0x6c, 0x6c])
                },
                {
                    isChanged: false,
                    offset: 12,
                    lengthAtLastSave: 6,
                    hexData: Buffer.from([0x74, 0x65, 0x73, 0x74, 0x31, 0x32])
                },
                {
                    isChanged: false,
                    offset: 0,
                    lengthAtLastSave: 6,
                    hexData: Buffer.from([0x67, 0x00, 0x00, 0x00, 0x00, 0x00])
                }
            ];

            const oldData = Buffer.from([
                0x67, 0x00, 0x00, 0x00, 0x00, 0x00, 0x4f, 0x6c, 0x64, 0x44,
                0x61, 0x74, 0x74, 0x65, 0x73, 0x74, 0x31, 0x32
            ]);

            const expectedResult = Buffer.from([
                0x67, 0x00, 0x00, 0x00, 0x00, 0x00, 0x68, 0x65, 0x6c, 0x6c,
                0x74, 0x65, 0x73, 0x74, 0x31, 0x32
            ]);

            const result = FTCTableStrategy.getTable2BinaryData(
                table2Records,
                oldData
            );

            expect(result).to.eql([expectedResult]);
            expect(table2Records[0].offset).to.equal(0);
            expect(table2Records[1].offset).to.equal(6);
            expect(table2Records[2].offset).to.equal(10);
            expect(table2Records[3].offset).to.equal(0);
        });

        it('gives expected results if a field is larger than it originally was', () => {
            const table2Records = [
                {
                    isChanged: false,
                    offset: 0,
                    lengthAtLastSave: 6,
                    hexData: Buffer.from([0x67, 0x00, 0x00, 0x00, 0x00, 0x00])
                },
                {
                    isChanged: true,
                    offset: 6,
                    lengthAtLastSave: 6,
                    hexData: Buffer.from([
                        0x68, 0x65, 0x6c, 0x6c, 0x50, 0x40, 0x30, 0x20, 0x10,
                        0x00
                    ])
                },
                {
                    isChanged: false,
                    offset: 12,
                    lengthAtLastSave: 6,
                    hexData: Buffer.from([0x74, 0x65, 0x73, 0x74, 0x31, 0x32])
                },
                {
                    isChanged: false,
                    offset: 0,
                    lengthAtLastSave: 6,
                    hexData: Buffer.from([0x67, 0x00, 0x00, 0x00, 0x00, 0x00])
                }
            ];

            const oldData = Buffer.from([
                0x67, 0x00, 0x00, 0x00, 0x00, 0x00, 0x4f, 0x6c, 0x64, 0x44,
                0x61, 0x74, 0x74, 0x65, 0x73, 0x74, 0x31, 0x32
            ]);

            const expectedResult = Buffer.from([
                0x67, 0x00, 0x00, 0x00, 0x00, 0x00, 0x68, 0x65, 0x6c, 0x6c,
                0x50, 0x40, 0x30, 0x20, 0x10, 0x00, 0x74, 0x65, 0x73, 0x74,
                0x31, 0x32
            ]);

            const result = FTCTableStrategy.getTable2BinaryData(
                table2Records,
                oldData
            );

            expect(result).to.eql([expectedResult]);
            expect(table2Records[0].offset).to.equal(0);
            expect(table2Records[1].offset).to.equal(6);
            expect(table2Records[2].offset).to.equal(16);
            expect(table2Records[3].offset).to.equal(0);

            expect(table2Records[0].lengthAtLastSave).to.equal(6);
            expect(table2Records[1].lengthAtLastSave).to.equal(10);
            expect(table2Records[0].lengthAtLastSave).to.equal(6);
            expect(table2Records[0].lengthAtLastSave).to.equal(6);
        });

        // it('performance test', () => {
        //     let table2RecordsPerformanceTest = [];

        //     let index = 0;

        //     for (let i = 0; i < 20000; i++) {
        //         const data = [0x74, 0x65, 0x73, 0x74, 0x31, 0x32, 0x74, 0x65, 0x73, 0x74, 0x31, 0x32,
        //             0x74, 0x65, 0x73, 0x74, 0x31, 0x32, 0x74, 0x65, 0x73, 0x74, 0x31, 0x32, 0x00];

        //         table2RecordsPerformanceTest.push({
        //             'isChanged': false,
        //             'offset': index,
        //             'lengthAtLastSave': data.length,
        //             'hexData': Buffer.from(data)
        //         });

        //         index += data.length;
        //     }

        //     for (let i = 0; i < 5000; i++) {
        //         table2RecordsPerformanceTest.push({
        //             'isChanged': false,
        //             'offset': 0,
        //             'lengthAtLastSave': 25,
        //             'hexData': Buffer.from([0x74, 0x65, 0x73, 0x74, 0x31, 0x32, 0x74, 0x65, 0x73, 0x74, 0x31, 0x32,
        //                 0x74, 0x65, 0x73, 0x74, 0x31, 0x32, 0x74, 0x65, 0x73, 0x74, 0x31, 0x32, 0x00])
        //         });
        //     }

        //     let oldBuffer = Buffer.concat(table2RecordsPerformanceTest.map((record) => {
        //         return record.hexData;
        //     }));

        //     let record = table2RecordsPerformanceTest[200];
        //     record.isChanged = true;
        //     record.hexData = Buffer.from([0x20, 0x50]);

        //     // let record2 = table2RecordsPerformanceTest[250];
        //     // record2.isChanged = true;
        //     // record2.hexData = Buffer.from([0x20, 0x50]);

        //     // let record3 = table2RecordsPerformanceTest[5000];
        //     // record3.isChanged = true;
        //     // record3.hexData = Buffer.from([0x20, 0x50]);

        //     // let record4 = table2RecordsPerformanceTest[19000];
        //     // record4.isChanged = true;
        //     // record4.hexData = Buffer.from([0x20, 0x50]);

        //     console.time('getTable2BinaryData');
        //     const perfTestResult = FTCTableStrategy.getTable2BinaryData(table2RecordsPerformanceTest, oldBuffer);
        //     console.timeEnd('getTable2BinaryData');
        // });
    });

    describe('returns a list of mandatory offsets', () => {
        it('returns a list of offset names that have a second table value', () => {
            let offsetTable = [
                {
                    name: 'Test',
                    type: 'string',
                    valueInSecondTable: true
                },
                {
                    name: 'Test2',
                    type: 's_int',
                    valueInSecondTable: false
                }
            ];

            expect(FTCTableStrategy.getMandatoryOffsets(offsetTable)).to.eql([
                'Test'
            ]);
        });
    });
});
