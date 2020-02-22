const expect = require('chai').expect;
const schemaPicker = require('../../services/schemaPicker');

const schemaPickerSettings = {
  'schemaDirectory': 'C:\\Projects\\madden-franchise\\tests\\data\\test-schemas'
};

describe('schema picker service unit tests', () => {
  describe('retrieves the expected schema', () => {
    it('retrieves the exact schema match if exists', () => {
      const schema = schemaPicker.pick(19, 95, 7, schemaPickerSettings);
      expect(schema.major).to.equal(95);
      expect(schema.minor).to.equal(7);
      expect(schema.path).to.equal('C:\\Projects\\madden-franchise\\data\\schemas\\19\\M19_95_7.gz');
    });

    it('retrieves the closest schema without going over if exact match doesnt exist', () => {
      const schema = schemaPicker.pick(20, 350, 1, schemaPickerSettings);
      expect(schema.major).to.equal(342);
      expect(schema.minor).to.equal(1);
      expect(schema.path).to.equal('C:\\Projects\\madden-franchise\\tests\\data\\test-schemas\\M20_342_1.gz');
    });

    it('retrieves the closest one after if no earlier file exists', () => {
      const schema = schemaPicker.pick(20, 330, 1, schemaPickerSettings);
      expect(schema.major).to.equal(342);
      expect(schema.minor).to.equal(1);
      expect(schema.path).to.equal('C:\\Projects\\madden-franchise\\tests\\data\\test-schemas\\M20_342_1.gz');
    });

    it('retrieves the closest one before if no higher one exists', () => {
      const schema = schemaPicker.pick(20, 371, 1, schemaPickerSettings);
      expect(schema.major).to.equal(370);
      expect(schema.minor).to.equal(0);
      expect(schema.path).to.equal('C:\\Projects\\madden-franchise\\data\\schemas\\20\\M20_370_0.gz');
    });

    it('retrieves schemas in a custom directory', () => {
      const schema = schemaPicker.pick(20, 367, 1, {
        'schemaDirectory': 'C:\\Projects\\madden-franchise\\tests\\data\\test-schemas'
      });

      expect(schema.major).to.equal(367);
      expect(schema.minor).to.equal(1);
      expect(schema.path).to.equal('C:\\Projects\\madden-franchise\\tests\\data\\test-schemas\\367_1.FTX');
    });

    it('retrieves the most recent schema if schema meta is 0', () => {
      const schema = schemaPicker.pick(19, 0, 0, schemaPickerSettings);
      
      expect(schema.major).to.equal(95);
      expect(schema.minor).to.equal(7);
      expect(schema.path).to.equal('C:\\Projects\\madden-franchise\\data\\schemas\\19\\M19_95_7.gz');
    });
  });

  it('returns a list of saved schemas', () => {
    const schemas = schemaPicker.retrieveSchemas();
    expect(schemas.length).to.equal(2);
    expect(schemas[0].major).to.equal(95);
    expect(schemas[1].major).to.equal(370);
  }); 
});