const sinon = require('sinon');
const expect = require('chai').expect;
const proxyquire = require('proxyquire');

const strategySpy = {
    'generateUnpackedContents': sinon.spy()
};

const M20FileStrategy = proxyquire('../../../../strategies/franchise/m20/M20FileStrategy', {
    '../../common/file/CommonFileStrategy': strategySpy
});

describe('M19 File Strategy unit tests', () => {
    beforeEach(() => {
        strategySpy.generateUnpackedContents.resetHistory();
    });

    describe('can save updates made to data', () => {
        it('calls the common strategy correctly', () => {
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

            M20FileStrategy.generateUnpackedContents(tables, data);

            expect(strategySpy.generateUnpackedContents.calledOnce).to.be.true;
            expect(strategySpy.generateUnpackedContents.args[0][0]).to.eql(tables);
            expect(strategySpy.generateUnpackedContents.args[0][1]).to.eql(data);
        });
    });
})