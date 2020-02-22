const expect = require('chai').expect;
const M19Table2FieldStrategy = require('../../../../strategies/common/table2Field/FranchiseTable2FieldStrategy');

describe('M19 Table2 Field Strategy', () => {
    describe('set unformatted value from formatted value', () => {
        it('normal case', () => {
            const result = M19Table2FieldStrategy.setUnformattedValueFromFormatted('hello', 10);
            expect(result).to.equal('01101000011001010110110001101100011011110000000000000000000000000000000000000000');
        });

        it('empty value', () => {
            const result = M19Table2FieldStrategy.setUnformattedValueFromFormatted('', 10);
            expect(result).to.equal('00000000000000000000000000000000000000000000000000000000000000000000000000000000');
        });
    });
});