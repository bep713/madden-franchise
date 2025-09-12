import sinon from 'sinon';
import { expect } from 'chai';
import quibble from 'quibble';

const strategySpy = {
    getInitialUnformattedValue: sinon.spy(),
    setUnformattedValueFromFormatted: sinon.spy()
};

describe('M19 FTC Table2 Field Strategy unit tests', () => {
    let M19FTCTable2Strategy;
    beforeEach(async () => {
        strategySpy.getInitialUnformattedValue.resetHistory();
        strategySpy.setUnformattedValueFromFormatted.resetHistory();

        await quibble.esm(
            '../../../../../src/strategies/common/table2Field/FTCTable2FieldStrategy.js',
            {},
            strategySpy
        );
        M19FTCTable2Strategy = (
            await import(
                '../../../../../src/strategies/franchise-common/m19/M19FTCTable2FieldStrategy.js'
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

        M19FTCTable2Strategy.getInitialUnformattedValue(field, binary);
        expect(strategySpy.getInitialUnformattedValue.calledOnce).to.be.true;
        expect(strategySpy.getInitialUnformattedValue.args[0][0]).to.eql(field);
        expect(strategySpy.getInitialUnformattedValue.args[0][1]).to.eql(
            binary
        );
    });

    describe('can save updates made to data', () => {
        it('calls the common file algorithm', () => {
            M19FTCTable2Strategy.setUnformattedValueFromFormatted('hello', 10);
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
