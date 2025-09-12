import { expect } from 'chai';
import common from '../../common/common.js';
import CommonFileStrategy from '../../../../src/strategies/common/file/CommonFileStrategy.js';

describe('Common File Strategy unit tests', () => {
    describe('can save updates made to data', () => {
        it('returns expected result when no tables change', () => {
            let tables = [{
                'offset': 0,
                'lengthAtLastSave': 6,
                'data': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'hexData': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'isChanged': false
            }, {
                'offset': 6,
                'lengthAtLastSave': 6,
                'data': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'hexData': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'isChanged': false
            }]
            
            let data = Buffer.concat(tables.map((table) => {
                return table.hexData;
            }));

            const result = CommonFileStrategy.generateUnpackedContents(tables, data);
            common.hashCompare(result, data);
        });

        it('returns expected result when one table changes', () => {
            let tables = [{
                'offset': 0,
                'lengthAtLastSave': 6,
                'data': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'hexData': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'isChanged': false
            }, {
                'offset': 6,
                'lengthAtLastSave': 6,
                'data': Buffer.from([0x4E, 0x65, 0x77, 0x44, 0x61, 0x74]),
                'hexData': Buffer.from([0x4E, 0x65, 0x77, 0x44, 0x61, 0x74]),
                'isChanged': true
            }]
            
            let data = Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74, 0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]);

            const expectedData = Buffer.concat(tables.map((table) => {
                return table.hexData;
            }));

            const result = CommonFileStrategy.generateUnpackedContents(tables, data);
            common.hashCompare(result, expectedData);
        });

        it('returns expected result when multiple tables change', () => {
            let tables = [{
                'offset': 0,
                'lengthAtLastSave': 6,
                'data': Buffer.from([0x4E, 0x65, 0x77, 0x44, 0x61, 0x74]),
                'hexData': Buffer.from([0x4E, 0x65, 0x77, 0x44, 0x61, 0x74]),
                'isChanged': true
            }, {
                'offset': 6,
                'lengthAtLastSave': 6,
                'data': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'hexData': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'isChanged': false
            }, {
                'offset': 12,
                'lengthAtLastSave': 6,
                'data': Buffer.from([0x4E, 0x65, 0x77, 0x44, 0x61, 0x74]),
                'hexData': Buffer.from([0x4E, 0x65, 0x77, 0x44, 0x61, 0x74]),
                'isChanged': true
            }, {
                'offset': 18,
                'lengthAtLastSave': 6,
                'data': Buffer.from([0x4E, 0x65, 0x77, 0x44, 0x61, 0x74]),
                'hexData': Buffer.from([0x4E, 0x65, 0x77, 0x44, 0x61, 0x74]),
                'isChanged': false
            }]
            
            let data = Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74, 0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74, 0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74,
                0x4E, 0x65, 0x77, 0x44, 0x61, 0x74]);

            const expectedData = Buffer.concat(tables.map((table) => {
                return table.hexData;
            }));

            const result = CommonFileStrategy.generateUnpackedContents(tables, data);
            common.hashCompare(result, expectedData);
        });

        it('returns expected result when one table length is smaller', () => {
            let tables = [{
                'offset': 0,
                'lengthAtLastSave': 6,
                'data': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'hexData': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'isChanged': false
            }, {
                'offset': 6,
                'lengthAtLastSave': 6,
                'data': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'hexData': Buffer.from([0x4E, 0x65, 0x77, 0x44, 0x61]),
                'isChanged': true
            }, {
                'offset': 11,
                'lengthAtLastSave': 6,
                'data': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'hexData': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'isChanged': false
            }]
            
            let data = Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74, 0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74, 0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]);

            const expectedData = Buffer.concat(tables.map((table) => {
                return table.hexData;
            }));

            const result = CommonFileStrategy.generateUnpackedContents(tables, data);
            expect(result).to.eql(expectedData);
        });

        it('returns expected result when one table length is larger', () => {
            let tables = [{
                'offset': 0,
                'lengthAtLastSave': 6,
                'data': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'hexData': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'isChanged': false
            }, {
                'offset': 6,
                'lengthAtLastSave': 6,
                'data': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'hexData': Buffer.from([0x4E, 0x65, 0x77, 0x44, 0x61, 0x74, 0x80]),
                'isChanged': true
            }, {
                'offset': 11,
                'lengthAtLastSave': 6,
                'data': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'hexData': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'isChanged': false
            }]
            
            let data = Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74, 0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74, 0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]);

            const expectedData = Buffer.concat(tables.map((table) => {
                return table.hexData;
            }));

            const result = CommonFileStrategy.generateUnpackedContents(tables, data);
            expect(result).to.eql(expectedData);
        });

        it('sets change indicator back to false', () => {
            let tables = [{
                'offset': 0,
                'lengthAtLastSave': 6,
                'data': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'hexData': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'isChanged': false
            }, {
                'offset': 6,
                'lengthAtLastSave': 6,
                'data': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'hexData': Buffer.from([0x4E, 0x65, 0x77, 0x44, 0x61, 0x74, 0x80]),
                'isChanged': true
            }, {
                'offset': 11,
                'lengthAtLastSave': 6,
                'data': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'hexData': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'isChanged': false
            }]
            
            let data = Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74, 0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74, 0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]);

            Buffer.concat(tables.map((table) => {
                return table.hexData;
            }));

            CommonFileStrategy.generateUnpackedContents(tables, data);
            expect(tables[1].isChanged).to.be.false;
        });
    });
})