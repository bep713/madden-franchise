import fs from 'fs';
import zlib from 'zlib';
import path, { dirname } from 'path';
import { expect } from 'chai';
import schemaGenerator from '../../src/services/schemaGenerator.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const NUM_CUSTOM_SCHEMAS = 16;

const TEST_SCHEMA_FOLDER = path.join(__dirname, '../data/test-schemas/');
const SCHEMA_PATHS = {
    outputTest: path.join(TEST_SCHEMA_FOLDER, 'output-test'),
    m22: {
        xml: path.join(TEST_SCHEMA_FOLDER, 'M22_329_0.FTX'),
        gz: path.join(TEST_SCHEMA_FOLDER, 'M22_329_0.gz'),
        outputTest: path.join(TEST_SCHEMA_FOLDER, 'output-test/M22_328_1.gz')
    },
    m25: {
        xml: path.join(TEST_SCHEMA_FOLDER, 'M25_222_6_test.ftx'),
        gz: path.join(TEST_SCHEMA_FOLDER, 'M25_222_6.gz')
    }
};

describe('schema generator unit tests', () => {
    let schemaRoot;

    before(async () => {
        schemaGenerator.generate(SCHEMA_PATHS.m22.xml);

        schemaRoot = await new Promise((resolve) => {
            schemaGenerator.eventEmitter.on('schemas:done', (schema) => {
                resolve(schema);
            });
        });
    });

    it('contains the correct amount of schemas', async () => {
        expect(schemaRoot.schemas.length).to.equal(2999);
        expect(Object.keys(schemaRoot.schemaMap).length).to.equal(2982); // extra schemas not added to schema map
    });

    describe('schemaRoot format', () => {
        it('meta', () => {
            expect(schemaRoot.meta).to.eql({
                major: 329,
                minor: 0,
                gameYear: 22
            });
        });

        it('individual schema attributes', () => {
            // first few schemas are custom added in the data/schemas/extra-schemas.json file
            // so start with 12th index which would be the first schema in the actual file.
            const schema = schemaRoot.schemas[NUM_CUSTOM_SCHEMAS + 1];

            expect(schema.assetId).to.be.undefined;
            expect(schema.ownerAssetId).to.equal('46647');
            expect(schema.numMembers).to.equal('3');
            expect(schema.name).to.equal('AdjustTeamRoster_Formula');
            expect(schema.base).to.equal('none()');
            expect(schema.attributes.length).to.equal(2);
        });

        it('individual schema attributes', () => {
            const schema = schemaRoot.schemas[NUM_CUSTOM_SCHEMAS + 1];
            const firstAttribute = schema.attributes[0];

            expect(firstAttribute.index).to.equal('0');
            expect(firstAttribute.name).to.equal('Subject');
            expect(firstAttribute.type).to.equal('Team');

            const secondAttribute = schema.attributes[1];

            expect(secondAttribute.index).to.equal('1');
            expect(secondAttribute.name).to.equal('SubjectIndex');
            expect(secondAttribute.type).to.equal('int');
            expect(secondAttribute.minValue).to.equal('0');
            expect(secondAttribute.maxValue).to.equal('100');
            expect(secondAttribute.default).to.equal('0');
        });

        it('correctly parses a final attribute', () => {
            const schema = schemaRoot.schemaMap.ActivityCompletedEvent;
            expect(schema.attributes[0].name).to.equal('Enqueue');
            expect(schema.attributes[0].final).to.equal('true');
        });

        it('correctly parses a max length attribute', () => {
            const schema = schemaRoot.schemaMap.AdvanceStageRequest;
            const attr = schema.attributes.find((attr) => attr.maxLength);
            expect(attr.maxLength).to.equal('13');
        });

        it('correctly parses a const attribute', () => {
            const schema = schemaRoot.schemaMap.AdvanceStageRequest;
            const constAttr = schema.attributes.find((attr) => attr.const);
            expect(constAttr.const).to.equal('true');
        });

        it('correctly parses an enum attribute', () => {
            const schema = schemaRoot.schemaMap.AdvanceStageRequest;
            const reqStyle = schema.attributes.find(
                (attr) => attr.name === 'RequestStyle'
            );
            expect(reqStyle.enum).to.eql({
                _name: 'RequestStyle',
                _assetId: '116422',
                _isRecordPersistent: 'true',
                _maxLength: 2,
                _members: [
                    {
                        _name: 'Default',
                        _index: 0,
                        _value: 0,
                        _unformattedValue: '00'
                    },
                    {
                        _name: 'Primary',
                        _index: 1,
                        _value: 1,
                        _unformattedValue: '01'
                    },
                    {
                        _name: 'Notification',
                        _index: 2,
                        _value: 2,
                        _unformattedValue: '10'
                    },
                    {
                        _name: 'Blocker',
                        _index: 3,
                        _value: 3,
                        _unformattedValue: '11'
                    }
                ]
            });
        });
    });

    it('correct output', async () => {
        schemaGenerator.generate(SCHEMA_PATHS.m25.xml);

        let schemaRoot = await new Promise((resolve) => {
            schemaGenerator.eventEmitter.on('schemas:done', (schema) => {
                resolve(schema);
            });
        });

        const newData = {
            meta: schemaRoot.meta,
            schemas: schemaRoot.schemas
        };

        const compareData = JSON.parse(JSON.stringify(newData));

        const expectedGzip = fs.readFileSync(SCHEMA_PATHS.m25.gz);
        const expectedData = JSON.parse(
            zlib.gunzipSync(expectedGzip).toString()
        );

        expect(compareData.meta).to.eql(expectedData.meta);

        compareData.schemas.forEach((schema, index) => {
            expect(schema, schema.name).to.eql(expectedData.schemas[index]);
        });

        // expect(compareData).to.eql(expectedData);
    });
});
