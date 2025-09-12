import { expect } from 'chai';
import FTCTable2FieldStrategy from '../../../../src/strategies/common/table2Field/FTCTable2FieldStrategy.js';

describe('FTC Table2 Field Strategy', () => {
    describe('get initial unformatted value', () => {
        it('returns expected result', () => {
            const field = {
                secondTableField: {
                    index: 0
                },
                offset: {
                    maxLength: 14
                }
            };

            const buffer = Buffer.from([
                0x43, 0x6f, 0x61, 0x63, 0x68, 0x20, 0x54, 0x72, 0x61, 0x69,
                0x74, 0x00, 0x10, 0x00
            ]);

            const result = FTCTable2FieldStrategy.getInitialUnformattedValue(
                field,
                buffer
            );
            expect(result).to.eql(buffer.slice(0, 12));
        });

        it('returns expected result if index is greater than 1', () => {
            const field = {
                secondTableField: {
                    index: 1
                },
                offset: {
                    maxLength: 14
                }
            };

            const buffer = Buffer.from([
                0x43, 0x6f, 0x61, 0x63, 0x68, 0x20, 0x54, 0x72, 0x61, 0x69,
                0x74, 0x00, 0x10, 0x00
            ]);

            const result = FTCTable2FieldStrategy.getInitialUnformattedValue(
                field,
                buffer
            );
            expect(result).to.eql(buffer.slice(1, 12));
        });
    });

    describe('set unformatted value from formatted value', () => {
        it('normal case', () => {
            const result =
                FTCTable2FieldStrategy.setUnformattedValueFromFormatted(
                    'hello',
                    10
                );
            expect(result).to.eql(
                Buffer.from([0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x00])
            );
        });

        it('empty value', () => {
            const result =
                FTCTable2FieldStrategy.setUnformattedValueFromFormatted('', 10);
            expect(result).to.eql(Buffer.from([0x00]));
        });

        it('value exceeding max length', () => {
            const result =
                FTCTable2FieldStrategy.setUnformattedValueFromFormatted(
                    'hello',
                    4
                );
            // Since the max length is 4, we would expect to see the first 3 characters of 'hello' (hel) plus the null character added.
            expect(result).to.eql(Buffer.from([0x68, 0x65, 0x6c, 0x00]));
        });
    });
});
