const expect = require('chai').expect;
const common = require('../../common/common');
const M19TableStrategy = require('../../../../strategies/franchise/m19/M19TableStrategy');

describe('M19 Table Strategy unit tests', () => {
    describe('get table2 binary data', () => {
        it('gives expected result if all fields are parsed', () => {
            const table2Records = [{
                'isChanged': false,
                'index': 0,
                'hexData': Buffer.from([0x67, 0x00, 0x00, 0x00, 0x00, 0x00])
            }, {
                'isChanged': true,
                'index': 6,
                'hexData': Buffer.from([0x68, 0x65, 0x6C, 0x6C, 0x6F, 0x00])
            }, {
                'isChanged': false,
                'index': 12,
                'hexData': Buffer.from([0x74, 0x65, 0x73, 0x74, 0x31, 0x32])
            }, {
                'isChanged': false,
                'index': 0,
                'hexData': Buffer.from([0x67, 0x00, 0x00, 0x00, 0x00, 0x00])
            }];

            const oldData = Buffer.from([0x67, 0x00, 0x00, 0x00, 0x00, 0x00, 0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74, 
                0x74, 0x65, 0x73, 0x74, 0x31, 0x32, 0x67, 0x00, 0x00, 0x00, 0x00, 0x00]);

            const result = M19TableStrategy.getTable2BinaryData(table2Records, oldData);

            const expectedResult = table2Records.reduce((prev, cur) => {
                return Buffer.concat([prev, cur.hexData]);
            }, Buffer.alloc(0));

            common.hashCompare(Buffer.concat(result), expectedResult);
        });

        it('gives expected results if certain fields are omitted', () => {
            const table2Records = [{
                'isChanged': false,
                'index': 0,
                'hexData': Buffer.from([0x67, 0x00, 0x00, 0x00, 0x00, 0x00])
            }, {
                'isChanged': true,
                'index': 6,
                'hexData': Buffer.from([0x68, 0x65, 0x6C, 0x6C, 0x6F, 0x00])
            }, {
                'isChanged': false,
                'index': 18,
                'hexData': Buffer.from([0x74, 0x65, 0x73, 0x74, 0x31, 0x32])
            }, {
                'isChanged': false,
                'index': 0,
                'hexData': Buffer.from([0x67, 0x00, 0x00, 0x00, 0x00, 0x00])
            }];

            const oldData = Buffer.from([0x67, 0x00, 0x00, 0x00, 0x00, 0x00, 0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74, 0x68, 0x65, 
                0x6C, 0x6C, 0x6F, 0x00, 0x74, 0x65, 0x73, 0x74, 0x31, 0x32, 0x67, 0x00, 0x00, 0x00, 0x00, 0x00]);

            const expectedResult = Buffer.from([0x67, 0x00, 0x00, 0x00, 0x00, 0x00, 0x68, 0x65, 0x6C, 0x6C, 0x6F, 0x00, 0x68, 0x65, 
                0x6C, 0x6C, 0x6F, 0x00, 0x74, 0x65, 0x73, 0x74, 0x31, 0x32, 0x67, 0x00, 0x00, 0x00, 0x00, 0x00]);

            const result = M19TableStrategy.getTable2BinaryData(table2Records, oldData);
            
            common.hashCompare(Buffer.concat(result), expectedResult);
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
            expect(M19TableStrategy.getMandatoryOffsets()).to.eql([]);
        });
    });
});