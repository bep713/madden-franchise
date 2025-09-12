import sinon from 'sinon';
import { expect } from 'chai';
import quibble from 'quibble';

const strategySpy = {
    getInitialUnformattedValue: sinon.spy(),
    setUnformattedValueFromFormatted: sinon.spy()
};

describe('M19 Table2 Field Strategy', () => {
    let M19Table2FieldStrategy;

    beforeEach(async () => {
        strategySpy.getInitialUnformattedValue.resetHistory();
        strategySpy.setUnformattedValueFromFormatted.resetHistory();

        await quibble.esm(
            '../../../../src/strategies/common/table2Field/FranchiseTable2FieldStrategy.js',
            {},
            strategySpy
        );
        M19Table2FieldStrategy = (
            await import(
                '../../../../src/strategies/franchise/m19/M19Table2FieldStrategy.js'
            )
        ).default;
    });

    afterEach(() => {
        quibble.reset();
    });

    it('get initial unformatted value', () => {
        const field = {
            field: true
        };

        const binary = Buffer.from([0x00]);

        M19Table2FieldStrategy.getInitialUnformattedValue(field, binary);
        expect(strategySpy.getInitialUnformattedValue.calledOnce).to.be.true;
        expect(strategySpy.getInitialUnformattedValue.args[0][0]).to.eql(field);
        expect(strategySpy.getInitialUnformattedValue.args[0][1]).to.eql(
            binary
        );
    });

    describe('set unformatted value from formatted value', () => {
        it('calls the common strategy', () => {
            M19Table2FieldStrategy.setUnformattedValueFromFormatted(
                'hello',
                10
            );
            expect(strategySpy.setUnformattedValueFromFormatted.calledOnce).to
                .be.true;
            expect(
                strategySpy.setUnformattedValueFromFormatted.args[0][0]
            ).to.eql('hello');
            expect(
                strategySpy.setUnformattedValueFromFormatted.args[0][1]
            ).to.eql(10);
        });
    });
});
