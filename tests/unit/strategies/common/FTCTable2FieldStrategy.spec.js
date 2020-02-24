const expect = require('chai').expect;
const FTCTable2FieldStrategy = require('../../../../strategies/common/table2Field/FTCTable2FieldStrategy');

describe('FTC Table2 Field Strategy', () => {
    describe('get initial unformatted value', () => {
        it('returns expected result', () => {
            const field = {
                'secondTableField': {
                    'index': 0,
                },
                'offset': {
                    'maxLength': 14
                }
            };

            const buffer = Buffer.from([0x43, 0x6F, 0x61, 0x63, 0x68, 0x20, 0x54, 0x72, 0x61, 0x69, 0x74, 0x00, 0x10, 0x00]);

            const result = FTCTable2FieldStrategy.getInitialUnformattedValue(field, buffer);
            expect(result).to.eql('010000110110111101100001011000110110100000100000010101000111001001100001011010010111010000000000');
        });

        it('returns expected result if index is greater than 1', () => {
            const field = {
                'secondTableField': {
                    'index': 1,
                },
                'offset': {
                    'maxLength': 14
                }
            };

            const buffer = Buffer.from([0x43, 0x6F, 0x61, 0x63, 0x68, 0x20, 0x54, 0x72, 0x61, 0x69, 0x74, 0x00, 0x10, 0x00]);

            const result = FTCTable2FieldStrategy.getInitialUnformattedValue(field, buffer);
            expect(result).to.eql('0110111101100001011000110110100000100000010101000111001001100001011010010111010000000000');
        });
    });

    describe('set unformatted value from formatted value', () => {
        it('normal case', () => {
            const result = FTCTable2FieldStrategy.setUnformattedValueFromFormatted('hello', 10);
            expect(result).to.equal('011010000110010101101100011011000110111100000000');
        });

        it('empty value', () => {
            const result = FTCTable2FieldStrategy.setUnformattedValueFromFormatted('', 10);
            expect(result).to.equal('00000000');
        });

        it('value exceeding max length', () => {
            const result = FTCTable2FieldStrategy.setUnformattedValueFromFormatted('hello', 4);
            // Since the max length is 4, we would expect to see the first 3 characters of 'hello' (hel) plus the null character added.
            expect(result).to.equal('01101000011001010110110000000000');
        });
    });
});