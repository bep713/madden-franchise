const expect = require('chai').expect;
const FranchiseTable2FieldStrategy = require('../../../../strategies/common/table2Field/FranchiseTable2FieldStrategy');

describe('Franchise Table2 Field Strategy', () => {
    describe('get initial unformatted value', () => {
        it('returns expected value', () => {
            const field = {
                'secondTableField': {
                    'index': 0,
                },
                'offset': {
                    'maxLength': 14
                }
            };

            const buffer = Buffer.from([0x43, 0x6F, 0x61, 0x63, 0x68, 0x20, 0x54, 0x72, 0x61, 0x69, 0x74, 0x00, 0x00, 0x00]);

            const result = FranchiseTable2FieldStrategy.getInitialUnformattedValue(field, buffer);
            expect(result).to.eql('0100001101101111011000010110001101101000001000000101010001110010011000010110100101110100000000000000000000000000');
        });

        it('second table field index > 0', () => {
            const field = {
                'secondTableField': {
                    'index': 1,
                },
                'offset': {
                    'maxLength': 14
                }
            };

            const buffer = Buffer.from([0x43, 0x6F, 0x61, 0x63, 0x68, 0x20, 0x54, 0x72, 0x61, 0x69, 0x74, 0x00, 0x10, 0x00, 0x00]);

            const result = FranchiseTable2FieldStrategy.getInitialUnformattedValue(field, buffer);
            expect(result).to.eql('0110111101100001011000110110100000100000010101000111001001100001011010010111010000000000000100000000000000000000');
        });
    });

    describe('set unformatted value from formatted value', () => {
        it('normal case', () => {
            const result = FranchiseTable2FieldStrategy.setUnformattedValueFromFormatted('hello', 10);
            expect(result).to.equal('01101000011001010110110001101100011011110000000000000000000000000000000000000000');
        });

        it('empty value', () => {
            const result = FranchiseTable2FieldStrategy.setUnformattedValueFromFormatted('', 10);
            expect(result).to.equal('00000000000000000000000000000000000000000000000000000000000000000000000000000000');
        });

        it('value exceeding max length', () => {
            const result = FranchiseTable2FieldStrategy.setUnformattedValueFromFormatted('hello', 4);
            expect(result).to.equal('01101000011001010110110001101100');
        });
    });
});