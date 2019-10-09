const FranchiseSchema = require('../../FranchiseSchema');

describe('FranchiseSchema unit tests', () => {
  describe('retrieves the expected schema', () => {
    it('retrieves the exact schema match if exists', () => {
      const schema = new FranchiseSchema(19, 95, 7);
      // 95_7.gz
    });

    it('retrieves the closest schema without going over if exact match doesnt exist', () => {
      const schema = new FranchiseSchema(20, 350, 1);
      // 342_1.gz
    });

    it('retrieves the closest one after if no earlier file exists', () => {
      const schema = new FranchiseSchema(20, 100, 1);
      // 342_1.gz
    })
  })
})