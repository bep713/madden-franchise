import { expect } from 'chai';
import FranchiseTable2FieldStrategy from '../../../../src/strategies/common/table2Field/FranchiseTable2FieldStrategy.js';

describe('Franchise Table2 Field Strategy', () => {
    describe('get initial unformatted value', () => {
        it('returns expected value', () => {
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
                0x74, 0x00, 0x00, 0x00, 0x00, 0x70, 0x71
            ]);

            const result =
                FranchiseTable2FieldStrategy.getInitialUnformattedValue(
                    field,
                    buffer
                );
            expect(result).to.eql(buffer.slice(0, 14));
        });

        it('second table field index > 0', () => {
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
                0x74, 0x00, 0x10, 0x00, 0x00, 0x70
            ]);

            const result =
                FranchiseTable2FieldStrategy.getInitialUnformattedValue(
                    field,
                    buffer
                );
            expect(result).to.eql(buffer.slice(1, 15));
        });
    });

    describe('set unformatted value from formatted value', () => {
        it('normal case', () => {
            const result =
                FranchiseTable2FieldStrategy.setUnformattedValueFromFormatted(
                    'hello',
                    10
                );
            expect(result).to.eql(
                Buffer.from([
                    0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x00, 0x00, 0x00, 0x00
                ])
            );
        });

        it('empty value', () => {
            const result =
                FranchiseTable2FieldStrategy.setUnformattedValueFromFormatted(
                    '',
                    10
                );
            expect(result).to.eql(
                Buffer.from([
                    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
                ])
            );
        });

        it('value exceeding max length', () => {
            const result =
                FranchiseTable2FieldStrategy.setUnformattedValueFromFormatted(
                    'hello',
                    4
                );
            expect(result).to.eql(Buffer.from([0x68, 0x65, 0x6c, 0x6c]));
        });
    });
});
