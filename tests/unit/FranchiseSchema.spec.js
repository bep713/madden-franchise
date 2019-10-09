const expect = require('chai').expect;
const FranchiseSchema = require('../../FranchiseSchema');

describe('FranchiseSchema unit tests', () => {
  describe('retrieves the expected schema', () => {
    it('retrieves the exact schema match if exists', () => {
      const schema = new FranchiseSchema(19, 95, 7);
      expect(schema.schemaMeta.major).to.equal('95');
      expect(schema.schemaMeta.minor).to.equal('7');
    });

    it('retrieves the closest schema without going over if exact match doesnt exist', () => {
      const schema = new FranchiseSchema(20, 350, 1);
      expect(schema.schemaMeta.major).to.equal('342');
      expect(schema.schemaMeta.minor).to.equal('1');
    });

    it('retrieves the closest one after if no earlier file exists', () => {
      const schema = new FranchiseSchema(20, 100, 1);
      expect(schema.schemaMeta.major).to.equal('342');
      expect(schema.schemaMeta.minor).to.equal('1');
    });

    it('retrieves the closest one before if no higher one exists', () => {
      const schema = new FranchiseSchema(20, 370, 1);
      expect(schema.schemaMeta.major).to.equal('360');
      expect(schema.schemaMeta.minor).to.equal('1');
    });
  });
});