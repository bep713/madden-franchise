const path = require('path');
const expect = require('chai').expect;
const FranchiseSchema = require('../../FranchiseSchema');

describe('FranchiseSchema unit tests', () => {
  it('can load a gzip file', (done) => {
    const schema = new FranchiseSchema('tests/data/test-schemas/M20_360_1.gz')
      .once('schemas:done', () => {
        expect(schema.meta.major).to.equal(360);
        expect(schema.meta.minor).to.equal(1);
        expect(schema.meta.gameYear).to.equal(20);

        // will add extra schemas if they don't already exist
        expect(schema.schemas.length).to.equal(2636);
        expect(schema.schemas.find((schema) => { return schema.name === 'Scheduler'})).to.not.be.undefined;
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
        expect(schema.schemas.length).to.equal(2408);
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
        expect(schema.schemas.length).to.equal(2641);
        done();
      });

    schema.evaluate();
  });
});