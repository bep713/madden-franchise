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
      expect(schema.major).to.equal(371);
      expect(schema.minor).to.equal(1);
      expect(schema.path).to.equal('C:\\Projects\\madden-franchise\\data\\schemas\\20\\M20_371_1.gz');
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
    expect(schemas.length).to.equal(5);
    expect(schemas[0].major).to.equal(95);
    expect(schemas[1].major).to.equal(371);
    expect(schemas[2].major).to.equal(220);
    expect(schemas[3].major).to.equal(328);
  });

  it('retrieves M21 schema', () => {
    const schema = schemaPicker.pick(21, 202, 15, schemaPickerSettings);
      expect(schema.major).to.equal(202);
      expect(schema.minor).to.equal(15);
      expect(schema.path).to.equal('C:\\Projects\\madden-franchise\\tests\\data\\test-schemas\\M21_202_15.gz');
  });

  it('does not pick schema from different game year', () => {
    const schema = schemaPicker.pick(21, 95, 7, schemaPickerSettings);
      expect(schema.major).to.equal(202);
      expect(schema.minor).to.equal(15);
      expect(schema.path).to.equal('C:\\Projects\\madden-franchise\\tests\\data\\test-schemas\\M21_202_15.gz');
  });

  it('picks closest minor version', () => {
    const schema = schemaPicker.pick(21, 202, 16, schemaPickerSettings);
    expect(schema.major).to.equal(202);
    expect(schema.minor).to.equal(16);
    expect(schema.path).to.equal('C:\\Projects\\madden-franchise\\tests\\data\\test-schemas\\M21_202_16.gz');
  });

  it('ignores game year if null', () => {
    const schema = schemaPicker.pick(null, 328, 1, schemaPickerSettings);
    expect(schema.major).to.equal(328);
    expect(schema.minor).to.equal(1);
    expect(schema.path).to.equal('C:\\Projects\\madden-franchise\\data\\schemas\\22\\M22_328_1.gz')
  });

  it('picks closest match if game year is null', () => {
    const schema = schemaPicker.pick(null, 319, 1, schemaPickerSettings);
    expect(schema.major).to.equal(328);
    expect(schema.minor).to.equal(1);
    expect(schema.path).to.equal('C:\\Projects\\madden-franchise\\data\\schemas\\22\\M22_328_1.gz')
  });
});