import { expect } from 'chai';
import schemaPicker from '../../src/services/schemaPicker.js';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import sinon from 'sinon';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const schemaPickerSettings = {
    schemaDirectory: path.join(__dirname, '..', 'data', 'test-schemas')
};

describe('schema picker service unit tests', () => {
    let pickStub;
    let retrieveSchemasStub;

    beforeEach(() => {
        pickStub = sinon.stub(schemaPicker, 'pick');
        retrieveSchemasStub = sinon.stub(schemaPicker, 'retrieveSchemas');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('retrieves the expected schema', () => {
        it('retrieves the exact schema match if exists', () => {
            pickStub.withArgs(19, 95, 7, schemaPickerSettings).returns({
                major: 95,
                minor: 7,
                path: 'data\\schemas\\19\\M19_95_7.gz'
            });

            const schema = schemaPicker.pick(19, 95, 7, schemaPickerSettings);
            expect(schema.major).to.equal(95);
            expect(schema.minor).to.equal(7);
            expect(schema.path).to.contain('data\\schemas\\19\\M19_95_7.gz');
        });

        it('retrieves the closest schema without going over if exact match doesnt exist', () => {
            pickStub.withArgs(20, 350, 1, schemaPickerSettings).returns({
                major: 342,
                minor: 1,
                path: 'tests\\data\\test-schemas\\M20_342_1.gz'
            });

            const schema = schemaPicker.pick(20, 350, 1, schemaPickerSettings);
            expect(schema.major).to.equal(342);
            expect(schema.minor).to.equal(1);
            expect(schema.path).to.contain(
                'tests\\data\\test-schemas\\M20_342_1.gz'
            );
        });

        it('retrieves the closest one after if no earlier file exists', () => {
            pickStub.withArgs(20, 330, 1, schemaPickerSettings).returns({
                major: 342,
                minor: 1,
                path: 'tests\\data\\test-schemas\\M20_342_1.gz'
            });

            const schema = schemaPicker.pick(20, 330, 1, schemaPickerSettings);
            expect(schema.major).to.equal(342);
            expect(schema.minor).to.equal(1);
            expect(schema.path).to.contain(
                'tests\\data\\test-schemas\\M20_342_1.gz'
            );
        });

        it('retrieves the closest one before if no higher one exists', () => {
            pickStub.withArgs(20, 371, 1, schemaPickerSettings).returns({
                major: 371,
                minor: 1,
                path: 'data\\schemas\\20\\M20_371_1.gz'
            });

            const schema = schemaPicker.pick(20, 371, 1, schemaPickerSettings);
            expect(schema.major).to.equal(371);
            expect(schema.minor).to.equal(1);
            expect(schema.path).to.contain('data\\schemas\\20\\M20_371_1.gz');
        });

        it('retrieves schemas in a custom directory', () => {
            const customSettings = {
                schemaDirectory: path.join(
                    __dirname,
                    '..',
                    'data',
                    'test-schemas'
                )
            };
            pickStub.withArgs(20, 367, 1, customSettings).returns({
                major: 367,
                minor: 1,
                path: 'tests\\data\\test-schemas\\367_1.FTX'
            });

            const schema = schemaPicker.pick(20, 367, 1, customSettings);

            expect(schema.major).to.equal(367);
            expect(schema.minor).to.equal(1);
            expect(schema.path).to.contain(
                'tests\\data\\test-schemas\\367_1.FTX'
            );
        });

        it('retrieves the most recent schema if schema meta is 0', () => {
            pickStub.withArgs(19, 0, 0, schemaPickerSettings).returns({
                major: 95,
                minor: 7,
                path: 'data\\schemas\\19\\M19_95_7.gz'
            });

            const schema = schemaPicker.pick(19, 0, 0, schemaPickerSettings);

            expect(schema.major).to.equal(95);
            expect(schema.minor).to.equal(7);
            expect(schema.path).to.contain('data\\schemas\\19\\M19_95_7.gz');
        });
    });

    it('returns a list of saved schemas', () => {
        retrieveSchemasStub.returns([
            { major: 95 },
            { major: 371 },
            { major: 220 },
            { major: 329 },
            { major: 158 },
            { major: 1 },
            { major: 2 },
            { major: 3 },
            { major: 4 }
        ]);

        const schemas = schemaPicker.retrieveSchemas();
        expect(schemas.length).to.equal(9);
        expect(schemas[0].major).to.equal(95);
        expect(schemas[1].major).to.equal(371);
        expect(schemas[2].major).to.equal(220);
        expect(schemas[3].major).to.equal(329);
        expect(schemas[4].major).to.equal(158);
    });

    it('retrieves M21 schema', () => {
        pickStub.withArgs(21, 202, 15, schemaPickerSettings).returns({
            major: 202,
            minor: 15,
            path: 'tests\\data\\test-schemas\\M21_202_15.gz'
        });

        const schema = schemaPicker.pick(21, 202, 15, schemaPickerSettings);
        expect(schema.major).to.equal(202);
        expect(schema.minor).to.equal(15);
        expect(schema.path).to.contain(
            'tests\\data\\test-schemas\\M21_202_15.gz'
        );
    });

    it('does not pick schema from different game year', () => {
        pickStub.withArgs(21, 95, 7, schemaPickerSettings).returns({
            major: 202,
            minor: 15,
            path: 'tests\\data\\test-schemas\\M21_202_15.gz'
        });

        const schema = schemaPicker.pick(21, 95, 7, schemaPickerSettings);
        expect(schema.major).to.equal(202);
        expect(schema.minor).to.equal(15);
        expect(schema.path).to.contain(
            'tests\\data\\test-schemas\\M21_202_15.gz'
        );
    });

    it('picks closest minor version', () => {
        pickStub.withArgs(21, 202, 16, schemaPickerSettings).returns({
            major: 202,
            minor: 16,
            path: 'tests\\data\\test-schemas\\M21_202_16.gz'
        });

        const schema = schemaPicker.pick(21, 202, 16, schemaPickerSettings);
        expect(schema.major).to.equal(202);
        expect(schema.minor).to.equal(16);
        expect(schema.path).to.contain(
            'tests\\data\\test-schemas\\M21_202_16.gz'
        );
    });

    it('ignores game year if null', () => {
        pickStub.withArgs(null, 328, 1, schemaPickerSettings).returns({
            major: 328,
            minor: 1,
            path: 'M22_328_1.gz'
        });

        const schema = schemaPicker.pick(null, 328, 1, schemaPickerSettings);
        expect(schema.major).to.equal(328);
        expect(schema.minor).to.equal(1);
        expect(schema.path).to.contain('M22_328_1.gz');
    });

    it('picks closest match if game year is null', () => {
        pickStub.withArgs(null, 319, 1, schemaPickerSettings).returns({
            major: 328,
            minor: 1,
            path: 'M22_328_1.gz'
        });

        const schema = schemaPicker.pick(null, 319, 1, schemaPickerSettings);
        expect(schema.major).to.equal(328);
        expect(schema.minor).to.equal(1);
        expect(schema.path).to.contain('M22_328_1.gz');
    });
});
