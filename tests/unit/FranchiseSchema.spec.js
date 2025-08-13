import fs from 'fs';
import path, { dirname } from 'path';
import { expect } from 'chai';
import FranchiseSchema from '../../FranchiseSchema.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('FranchiseSchema unit tests', () => {
  it('can load a gzip file', (done) => {
    const schema = new FranchiseSchema('tests/data/test-schemas/M20_360_1.gz')
      .once('schemas:done', () => {
        expect(schema.meta.major).to.equal(360);
        expect(schema.meta.minor).to.equal(1);
        expect(schema.meta.gameYear).to.equal(20);

        // will add extra schemas if they don't already exist
        expect(schema.schemas.length).to.equal(2641);
        expect(schema.schemas.find((schema) => { return schema.name === 'Scheduler'})).to.not.be.undefined;

        // will add correct enums to the extra schemas
        const relativeAppt = schema.schemas.find((schema) => { return schema.name === 'Scheduler.RelativeApptDateTime'});
        expect(relativeAppt.attributes[2].enum).to.eql({
          _name: 'DayOfWeek',
          _assetId: '1592',
          _isRecordPersistent: 'true',
          _maxLength: 4,
          _members: [
            {
              _index: 0,
              _name: 'Sunday',
              _unformattedValue: '0000',
              _value: 0
            },
            {
              _index: 1,
              _name: 'Monday',
              _unformattedValue: '0001',
              _value: 1
            },
            {
              _index: 2,
              _name: 'Tuesday',
              _unformattedValue: '0010',
              _value: 2
            },
            {
              _index: 3,
              _name: 'Wednesday',
              _unformattedValue: '0011',
              _value: 3
            },
            {
              _index: 4,
              _name: 'Thursday',
              _unformattedValue: '0100',
              _value: 4
            },
            {
              _index: 5,
              _name: 'Friday',
              _unformattedValue: '0101',
              _value: 5
            },
            {
              _index: 6,
              _name: 'Saturday',
              _unformattedValue: '0110',
              _value: 6
            },
            {
              _index: 7,
              _name: 'Invalid_',
              _unformattedValue: '1000',
              _value: 8
            },
          ]
        });

        done();
      });

    schema.evaluate();
  });

  it('can load a xml file', (done) => {
    const schema = new FranchiseSchema('tests/data/test-schemas/schema-19.xml')
      .once('schemas:done', () => {
        expect(schema.meta.major).to.equal(95);
        expect(schema.meta.minor).to.equal(7);
        expect(schema.meta.gameYear).to.equal(19);
        expect(schema.schemas.length).to.equal(2413);
        done();
      });

    schema.evaluate();
  });

  it('can load a ftx file', (done) => {
    const schema = new FranchiseSchema(path.join(__dirname, '../data/test-schemas/367_1.FTX'))
      .once('schemas:done', () => {
        expect(schema.meta.major).to.equal(367);
        expect(schema.meta.minor).to.equal(1);
        expect(schema.meta.gameYear).to.equal(20);
        expect(schema.schemas.length).to.equal(2646);
        done();
      });

    schema.evaluate();
  });

  describe('new schema generation', () => {
    it('can load a xml file', (done) => {
      const schema = new FranchiseSchema('tests/data/test-schemas/schema-19.xml', {
        useNewSchemaGeneration: true,
        fileMap: {
          main: 'tests/data/test-schemas/schema-19.xml'
        }
      })
        .once('schemas:done', () => {
          expect(schema.meta.major).to.equal(95);
          expect(schema.meta.minor).to.equal(7);
          expect(schema.meta.gameYear).to.equal(19);
          expect(schema.schemas.length).to.equal(2413);
          done();
        });
  
      schema.evaluate();
    });

    it('can load a xml file - extra schemas', (done) => {
      const extraSchemas = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/schemas/extra-schemas.json'), 'utf8'));
      const schema = new FranchiseSchema('tests/data/test-schemas/schema-19.xml', {
        useNewSchemaGeneration: true,
        fileMap: {
          main: 'tests/data/test-schemas/schema-19.xml'
        },
        extraSchemas: extraSchemas.slice(0, extraSchemas.length - 1) // remove last schema to test extra schemas
      })
        .once('schemas:done', () => {
          expect(schema.schemas.length).to.equal(2412);
          done();
        });
  
      schema.evaluate();
    });
  
    it('can load a ftx file', (done) => {
      const schema = new FranchiseSchema(path.join(__dirname, '../data/test-schemas/367_1.FTX'), {
        useNewSchemaGeneration: true,
        fileMap: {
          main: path.join(__dirname, '../data/test-schemas/367_1.FTX')
        }
      })
        .once('schemas:done', () => {
          expect(schema.meta.major).to.equal(367);
          expect(schema.meta.minor).to.equal(1);
          expect(schema.meta.gameYear).to.equal(20);
          expect(schema.schemas.length).to.equal(2646);
          done();
        });
  
      schema.evaluate();
    });
  });
});