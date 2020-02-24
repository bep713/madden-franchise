const sinon = require('sinon');
const expect = require('chai').expect;
const proxyquire = require('proxyquire');

const strategySpy = {
    'postPackFile': sinon.spy(),
    'generateUnpackedContents': sinon.spy()
};

const M19FTCFileStrategy = proxyquire('../../../../../strategies/franchise-common/m20/M20FTCFileStrategy', {
    '../../common/file/FTCFileStrategy': strategySpy
});

describe('M20 FTC File Strategy unit tests', () => {
    beforeEach(() => {
        strategySpy.postPackFile.resetHistory();
        strategySpy.generateUnpackedContents.resetHistory();
    });

    describe('can save updates made to data', () => {
        it('calls the common file algorithm', () => {
            let tables = [{
                'offset': 0,
                'data': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'hexData': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'isChanged': false
            }, {
                'offset': 6,
                'data': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'hexData': Buffer.from([0x4F, 0x6C, 0x64, 0x44, 0x61, 0x74]),
                'isChanged': false
            }]
            
            let data = Buffer.concat(tables.map((table) => {
                return table.hexData;
            }));

            M19FTCFileStrategy.generateUnpackedContents(tables, data);
            expect(strategySpy.generateUnpackedContents.calledOnce).to.be.true;
            expect(strategySpy.generateUnpackedContents.args[0][0]).to.eql(tables);
            expect(strategySpy.generateUnpackedContents.args[0][1]).to.eql(data);
        });
    });

    it('post pack file', () => {
        const originalData = Buffer.from([0x20, 0x10, 0x00]);
        const newData = Buffer.from([0x50, 0x40, 0x30]);

        M19FTCFileStrategy.postPackFile(originalData, newData);

        expect(strategySpy.postPackFile.calledOnce).to.be.true;
        expect(strategySpy.postPackFile.args[0][0]).to.eql(originalData);
        expect(strategySpy.postPackFile.args[0][1]).to.eql(newData);
    });
});