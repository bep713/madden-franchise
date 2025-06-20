const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const expect = require('chai').expect;
const sinon = require('sinon');
const { generateSchemaV2 } = require('../../services/schemaGeneratorV2');

const NUM_CUSTOM_SCHEMAS = 16;
const TEST_SCHEMA_FOLDER = path.join(__dirname, '../data/test-schemas/');
const SCHEMA_PATHS = {
    m22: {
        xml: path.join(TEST_SCHEMA_FOLDER, 'M22_329_0.FTX'),
        gz: path.join(TEST_SCHEMA_FOLDER, 'M22_329_0.gz'),
    },
    m25: {
        xml: path.join(TEST_SCHEMA_FOLDER, 'M25_222_6_test.ftx'),
        gz: path.join(TEST_SCHEMA_FOLDER, 'M25_222_6.gz'),
    }
};

describe('schemaGeneratorV2 unit tests', () => {
    let schemaRoot;

    before(async () => {
        schemaRoot = await generateSchemaV2({ fileMap: { main: SCHEMA_PATHS.m22.xml } });
    });

    it('contains the correct amount of schemas', async () => {
        expect(schemaRoot.schemas.length).to.equal(2999);
        expect(Object.keys(schemaRoot.schemaMap).length).to.equal(2982);
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
            const attr = schema.attributes.find(attr => attr.maxLength);
            expect(attr.maxLength).to.equal('13');
        });

        it('correctly parses a const attribute', () => {
            const schema = schemaRoot.schemaMap.AdvanceStageRequest;
            const constAttr = schema.attributes.find(attr => attr.const);
            expect(constAttr.const).to.equal('true');
        });

        it('correctly parses an enum attribute', () => {
            const schema = schemaRoot.schemaMap.AdvanceStageRequest;
            const reqStyle = schema.attributes.find(attr => attr.name === 'RequestStyle');
            expect(reqStyle.enum).to.be.an('object');
            expect(reqStyle.enum._name).to.equal('RequestStyle');
        });
    });

    it('correct output', async () => {
        const schemaRoot = await generateSchemaV2({ fileMap: { main: SCHEMA_PATHS.m25.xml } });
        const newData = {
            meta: schemaRoot.meta,
            schemas: schemaRoot.schemas
        };
        const compareData = JSON.parse(JSON.stringify(newData));
        const expectedGzip = fs.readFileSync(SCHEMA_PATHS.m25.gz);
        const expectedData = JSON.parse(zlib.gunzipSync(expectedGzip).toString());
        expect(compareData.meta).to.eql(expectedData.meta);
        compareData.schemas.forEach((schema, index) => {
            expect(schema, schema.name).to.eql(expectedData.schemas[index]);
        });
    });
});

describe('schemaGeneratorV2 IncludeFile dependency tests', () => {
    it('parses includes before main file', async () => {
        const mainPath = path.join(__dirname, '../data/test-schemas/include-mock/main.FTX');
        const includePath = path.join(__dirname, '../data/test-schemas/include-mock/Football-Schemas.FTX');
        const fileMap = { main: mainPath, 'Football-Schemas': includePath };
        const result = await generateSchemaV2({ fileMap });
        expect(result.schemas.some(s => s.name === 'IncludedSchema')).to.be.true;

        const includedEnum = result.schemaMap.TestEnum.attributes.find(s => s.name === 'Test');
        expect(includedEnum).to.exist;
        expect(includedEnum.enum).to.be.an('object');
        expect(includedEnum.enum.name).to.equal('IncludedEnum');
    });
});
