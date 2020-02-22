const sinon = require('sinon');
const expect = require('chai').expect;
const proxyquire = require('proxyquire');

const strategySpy = {
    'setUnformattedValueFromFormatted': sinon.spy()
};

const M19Table2FieldStrategy = proxyquire('../../../../strategies/franchise/m20/M20Table2FieldStrategy', {
    '../../common/table2Field/FranchiseTable2FieldStrategy': strategySpy
});

describe('M20 Table2 Field Strategy', () => {
    beforeEach(() => {
        strategySpy.setUnformattedValueFromFormatted.resetHistory();
    });

    describe('set unformatted value from formatted value', () => {
        it('calls the common strategy', () => {
            M19Table2FieldStrategy.setUnformattedValueFromFormatted('hello', 10);
            expect(strategySpy.setUnformattedValueFromFormatted.calledOnce).to.be.true;
            expect(strategySpy.setUnformattedValueFromFormatted.args[0][0]).to.eql('hello')
            expect(strategySpy.setUnformattedValueFromFormatted.args[0][1]).to.eql(10)
        });
    });
});