import sinon from 'sinon';
import { expect } from 'chai';
import quibble from 'quibble';

const strategySpy = {
    'getInitialUnformattedValue': sinon.spy(),
    'setUnformattedValueFromFormatted': sinon.spy()
};

describe('M20 FTC Table2 Field Strategy unit tests', () => {
    let M20FTCTable2FieldStrategy;
    beforeEach(async () => {
        strategySpy.getInitialUnformattedValue.resetHistory();
        strategySpy.setUnformattedValueFromFormatted.resetHistory();

        await quibble.esm('../../../../../strategies/common/table2Field/FTCTable2FieldStrategy.js', {}, strategySpy);
        M20FTCTable2FieldStrategy = (await import('../../../../../strategies/franchise-common/m20/M20FTCTable2FieldStrategy.js')).default;
    });

    afterEach(() => {
        quibble.reset();
    });

    it('get initial unformatted value', () => {
        const field = {
            'field': true
        };

        const binary = Buffer.from([0x00]);

        M20FTCTable2FieldStrategy.getInitialUnformattedValue(field, binary);
        expect(strategySpy.getInitialUnformattedValue.calledOnce).to.be.true;
        expect(strategySpy.getInitialUnformattedValue.args[0][0]).to.eql(field);
        expect(strategySpy.getInitialUnformattedValue.args[0][1]).to.eql(binary);
    });

    describe('can save updates made to data', () => {
        it('calls the common file algorithm', () => {
            M20FTCTable2FieldStrategy.setUnformattedValueFromFormatted('hello', 10);
            expect(strategySpy.setUnformattedValueFromFormatted.calledOnce).to.be.true;
            expect(strategySpy.setUnformattedValueFromFormatted.args[0][0]).to.eql('hello');
            expect(strategySpy.setUnformattedValueFromFormatted.args[0][1]).to.eql(10);
        });
    });
});