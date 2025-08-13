import fs from 'fs';
import { expect } from 'chai';

import M19TableHeaderStrategy from '../../../../strategies/common/header/m19/M19TableHeaderStrategy.js';

import popularityComponentTableSchema from '../../../data/test-schemas/M19_PopularityComponentTable.json' with { type: "json" };
const popularityComponentTable = fs.readFileSync('tests/data/strategies/m19/PopularityComponentTable.frt');

const playerArrayTable = fs.readFileSync('tests/data/strategies/m19/PlayerArray.frt');

import playerTableSchema from '../../../data/test-schemas/M19_Player.json' with { type: "json" };
const playerTable = fs.readFileSync('tests/data/strategies/m19/Player.frt');

describe('M19 Table Header unit tests', () => {
    describe('parse header', () => {
        let result;

        it('method exists', () => {
            expect(M19TableHeaderStrategy.parseHeader).to.exist;
        });

        describe('PopularityComponentTable', () => {
            before(() => {
                result = M19TableHeaderStrategy.parseHeader(popularityComponentTable);
            });

            it('parses the table name', () => {
                expect(result.name).to.equal('PopularityComponentTable');
            });

            it('isArray', () => {
                expect(result.isArray).to.be.false;
            });

            it('parses correct table id', () => {
                expect(result.tableId).to.equal(4097);
            });

            it('table pad 1', () => {
                expect(result.tablePad1).to.equal(0);
            });

            it('table unknown 1', () => {
                expect(result.tableUnknown1).to.equal(64);
            });

            it('table unknown 2', () => {
                expect(result.tableUnknown2).to.equal(1);
            });

            it('data1 id', () => {
                expect(result.data1Id).to.equal('SPBF');
            });

            it('data1 type', () => {
                expect(result.data1Type).to.equal(95);
            });

            it('data1 unknown1', () => {
                expect(result.data1Unknown1).to.equal(7);
            });

            it('data1 flag1', () => {
                expect(result.data1Flag1).to.equal(1);
            });

            it('data1 flag2', () => {
                expect(result.data1Flag2).to.equal(1);
            });

            it('data1 flag3', () => {
                expect(result.data1Flag3).to.equal(0);
            });

            it('data1 flag4', () => {
                expect(result.data1Flag4).to.equal(0);
            });

            it('table store length', () => {
                expect(result.tableStoreLength).to.equal(0);
            });

            it('table store name', () => {
                expect(result.tableStoreName).to.equal(null);
            });

            it('data1 offset', () => {
                expect(result.data1Offset).to.equal(64);
            });

            it('data1 table id', () => {
                expect(result.data1TableId).to.equal(4097);
            });

            it('data 1 record count', () => {
                expect(result.data1RecordCount).to.equal(256);
            });

            it('data1 pad2', () => {
                expect(result.data1Pad2).to.equal(0);
            });

            it('table 1 length', () => {
                expect(result.table1Length).to.equal(1068);
            });

            it('table 2 length', () => {
                expect(result.table2Length).to.equal(0);
            });

            it('data1 pad3', () => {
                expect(result.data1Pad3).to.equal(0);
            });

            it('data1 pad4', () => {
                expect(result.data1Pad4).to.equal(0);
            });

            it('header offset', () => {
                expect(result.headerOffset).to.equal(228);
            });

            it('record1 size offset', () => {
                expect(result.record1SizeOffset).to.equal(1689);
            });

            it('record1 size length', () => {
                expect(result.record1SizeLength).to.equal(9);
            });

            it('offset start', () => {
                expect(result.offsetStart).to.equal(228);
            });

            it('data2 id', () => {
                expect(result.data2Id).to.equal('BSFT');
            });

            it('table1 length2', () => {
                expect(result.table1Length2).to.equal(1068);
            });

            it('table total length', () => {
                expect(result.tableTotalLength).to.equal(1068);
            });

            it('has second table', () => {
                expect(result.hasSecondTable).to.equal(false);
            });

            it('record words', () => {
                expect(result.recordWords).to.equal(1);
            });

            it('record capacity', () => {
                expect(result.recordCapacity).to.equal(256);
            });

            it('number of members', () => {
                expect(result.numMembers).to.equal(3);
            });

            it('next record to use', () => {
                expect(result.nextRecordToUse).to.equal(161);
            });
        });

        describe('Player[]', () => {
            before(() => {
                result = M19TableHeaderStrategy.parseHeader(playerArrayTable);
            });

            // Array tables do not have a defined schema.
            // We can get the following header attribs from the header

            it('header size', () => {
                expect(result.headerSize).to.equal(228);
            });

            it('record1 size', () => {
                expect(result.record1Size).to.equal(12);
            });

            it('table1StartIndex', () => {
                expect(result.table1StartIndex).to.equal(232);
            });
        });

        describe('Player', () => {
            before(() => {
                result = M19TableHeaderStrategy.parseHeader(playerTable);
            });

            // This table has a second table unlike the ones above.
            it('has second table', () => {
                expect(result.hasSecondTable).to.be.true;
            });

            it('table 2 length', () => {
                expect(result.table2Length).to.equal(392040);
            });
        })
    });

    describe('parse header attributes from schema', () => {
        let result;

        describe('PopularityComponentTable', () => {
            before(() => {
                const header = M19TableHeaderStrategy.parseHeader(popularityComponentTable);
                result = M19TableHeaderStrategy.parseHeaderAttributesFromSchema(popularityComponentTableSchema, popularityComponentTable, header);
            });

            it('header size', () => {
                expect(result.headerSize).to.equal(240);
            });

            it('record1 size', () => {
                expect(result.record1Size).to.equal(4);
            });

            it('table1 start index', () => {
                expect(result.table1StartIndex).to.equal(240);
            });

            it('table2 start index', () => {
                expect(result.table2StartIndex).to.equal(1264);
            });
        });

        describe('Player', () => {
            before(() => {
                const header = M19TableHeaderStrategy.parseHeader(playerTable);
                result = M19TableHeaderStrategy.parseHeaderAttributesFromSchema(playerTableSchema, playerTable, header);
            });

            it('header size', () => {
                expect(result.headerSize).to.equal(1472);
            });

            it('record1 size', () => {
                expect(result.record1Size).to.equal(340);
            });

            it('table1 start index', () => {
                expect(result.table1StartIndex).to.equal(1472);
            });

            it('table2 start index', () => {
                expect(result.table2StartIndex).to.equal(1347872);
            });
        });
    });
});