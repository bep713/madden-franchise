const sinon = require('sinon');
const expect = require('chai').expect;
const proxyquire = require('proxyquire');

const strategySpy = {
    'getInitialUnformattedValue': sinon.spy(),
    'setUnformattedValueFromFormatted': sinon.spy()
};

const M20FTCFileStrategy = proxyquire('../../../../../strategies/franchise-common/m20/M20FTCTable2FieldStrategy', {
    '../../common/table2Field/FTCTable2FieldStrategy': strategySpy
});

describe('M20 FTC Table2 Field Strategy unit tests', () => {
    beforeEach(() => {
        strategySpy.getInitialUnformattedValue.resetHistory();
        strategySpy.setUnformattedValueFromFormatted.resetHistory();
    });

    it('get initial unformatted value', () => {
        const field = {
            'field': true
        };

        const binary = Buffer.from([0x00]);

        M20FTCFileStrategy.getInitialUnformattedValue(field, binary);
        expect(strategySpy.getInitialUnformattedValue.calledOnce).to.be.true;
        expect(strategySpy.getInitialUnformattedValue.args[0][0]).to.eql(field);
        expect(strategySpy.getInitialUnformattedValue.args[0][1]).to.eql(binary);
    });

    describe('can save updates made to data', () => {
        it('calls the common file algorithm', () => {
            M20FTCFileStrategy.setUnformattedValueFromFormatted('hello', 10);
            expect(strategySpy.setUnformattedValueFromFormatted.calledOnce).to.be.true;
            expect(strategySpy.setUnformattedValueFromFormatted.args[0][0]).to.eql('hello');
            expect(strategySpy.setUnformattedValueFromFormatted.args[0][1]).to.eql(10);
        });
    });
});