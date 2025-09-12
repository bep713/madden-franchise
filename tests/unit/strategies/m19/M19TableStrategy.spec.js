import sinon from 'sinon';
import { expect } from 'chai';
import quibble from 'quibble';

const headerStrategySpy = {
    parseHeader: sinon.spy(),
    parseHeaderAttributesFromSchema: sinon.spy()
};

const tableStrategy = {
    getTable2BinaryData: sinon.spy(),
    getMandatoryOffsets: sinon.spy()
};

describe('M19 Table Field Strategy', () => {
    let M19TableStrategy;
    beforeEach(async () => {
        headerStrategySpy.parseHeader.resetHistory();
        headerStrategySpy.parseHeaderAttributesFromSchema.resetHistory();
        tableStrategy.getTable2BinaryData.resetHistory();
        tableStrategy.getMandatoryOffsets.resetHistory();

        await quibble.esm(
            '../../../../src/strategies/common/header/m19/M19TableHeaderStrategy.js',
            {},
            headerStrategySpy
        );
        await quibble.esm(
            '../../../../src/strategies/common/table/FranchiseTableStrategy.js',
            {},
            tableStrategy
        );
        M19TableStrategy = (
            await import(
                '../../../../src/strategies/franchise/m19/M19TableStrategy.js'
            )
        ).default;
    });

    afterEach(() => {
        quibble.reset();
    });

    it('parse header', () => {
        let buffer = Buffer.from([0x40, 0x30, 0x20, 0x10, 0x00]);
        M19TableStrategy.parseHeader(buffer);
        expect(headerStrategySpy.parseHeader.calledOnce).to.be.true;
        expect(headerStrategySpy.parseHeader.args[0][0]).to.eql(buffer);
    });

    it('parse header attributes from schema', () => {
        let buffer = Buffer.from([0x40, 0x30, 0x20, 0x10, 0x00]);
        let header = {
            header: true
        };
        let schema = {
            schema: true
        };

        M19TableStrategy.parseHeaderAttributesFromSchema(
            schema,
            buffer,
            header
        );
        expect(headerStrategySpy.parseHeaderAttributesFromSchema.calledOnce).to
            .be.true;
        expect(
            headerStrategySpy.parseHeaderAttributesFromSchema.args[0][0]
        ).to.eql(schema);
        expect(
            headerStrategySpy.parseHeaderAttributesFromSchema.args[0][1]
        ).to.eql(buffer);
        expect(
            headerStrategySpy.parseHeaderAttributesFromSchema.args[0][2]
        ).to.eql(header);
    });

    it('get table2 binary data', () => {
        let records = [
            {
                record: true
            }
        ];

        let buffer = Buffer.from([0x40, 0x30, 0x20, 0x10, 0x00]);

        M19TableStrategy.getTable2BinaryData(records, buffer);
        expect(tableStrategy.getTable2BinaryData.calledOnce).to.be.true;
        expect(tableStrategy.getTable2BinaryData.args[0][0]).to.eql(records);
        expect(tableStrategy.getTable2BinaryData.args[0][1]).to.eql(buffer);
    });

    it('get mandatory offsets', () => {
        let offsets = [
            {
                offset: true
            }
        ];

        M19TableStrategy.getMandatoryOffsets(offsets);
        expect(tableStrategy.getMandatoryOffsets.calledOnce).to.be.true;
        expect(tableStrategy.getMandatoryOffsets.args[0][0]).to.eql(offsets);
    });
});
