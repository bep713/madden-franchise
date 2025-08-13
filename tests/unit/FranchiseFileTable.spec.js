import fs from "fs";
import sinon from 'sinon';
import { expect } from "chai";
import quibble from "quibble";

const RecordStub = sinon.stub().callsFake(() => ({
  fieldsArray: []
}));

let FranchiseFileTable;

const expectedOffsetTables = {
  player: JSON.parse(fs.readFileSync("tests/data/offset-tables/M24_playerOffsetTable.json")),
  tunableData: JSON.parse(fs.readFileSync("tests/data/offset-tables/M24_SeasonScheduleManager.SeasonScheduleTunableDataOffsetTable.json")),
};

const schemaData = {
  player: JSON.parse(fs.readFileSync("tests/data/test-schemas/M24/PlayerSchema.json")),
  tunableData: JSON.parse(fs.readFileSync("tests/data/test-schemas/M24/SeasonScheduleManager.SeasonScheduleTunableDataSchema.json")),
};

const tableData = {
  player: fs.readFileSync("tests/data/tables/M24_Player_Table.dat"),
  tunableData: fs.readFileSync("tests/data/tables/M24_SeasonScheduleTunableData_Table.dat"),
};

function initializeTable(data, header) {
  return new FranchiseFileTable(
    data,
    0,
    24,
    {
      table: {
        parseHeader: () => header,
        parseHeaderAttributesFromSchema: () => ({ record1Size: header.record1Size, table1StartIndex: header.table1StartIndex, table2StartIndex: header.table2StartIndex }),
        getMandatoryOffsets: () => ({}),
      },
      table2Field: {
        getInitialUnformattedValue: () => null
      }
    },
    null
  );
}

describe("FranchiseFileTable unit tests", () => {
  let playerTable, tunableDataTable;

  beforeEach(async () => {
    await quibble.esm('../../FranchiseFileRecord.js', {}, RecordStub);
    FranchiseFileTable = (await import('../../FranchiseFileTable.js')).default;

    playerTable = initializeTable(tableData.player, {
      name: 'Player',
      offsetStart: 232,
      record1Size: 91*4,
      hasSecondTable: true,
      hasThirdTable: false,
      numMembers: 336,
      table1StartIndex: 1576,
      table2StartIndex: 1443016  
    });
  
    tunableDataTable = initializeTable(tableData.tunableData, {
      name: 'SeasonScheduleManager.SeasonScheduleTunableData',
      offsetStart: 232,
      record1Size: 14*4,
      hasSecondTable: false,
      hasThirdTable: false,
      numMembers: 28,
      table1StartIndex: 344,
      table2StartIndex: 400
    });
  });

  afterEach(() => {
    quibble.reset();
  });

  describe("offset table", () => {
    function assertGeneratedSchema(offsetTable, expectedOffsetTable) {
      expect(offsetTable.length).to.equal(expectedOffsetTable.length);

      offsetTable.forEach((entry, index) => {
        const expected = expectedOffsetTable[index];
        
        expect(entry.indexOffset).to.equal(expected.indexOffset);
        expect(entry.offset).to.equal(expected.offset);
        expect(entry.length).to.equal(expected.length);

        expect(entry.name).to.equal(`Field_${entry.index}`);
        expect(entry.type).to.equal('int');
        expect(entry.minValue).to.equal(1);
        expect(entry.maxValue).to.equal(1);
      });
    }

    describe("with schema", () => {
      it("schedule tunable data", async () => {
        tunableDataTable.schema = schemaData.tunableData;
        await tunableDataTable.readRecords();
        expect(JSON.parse(JSON.stringify(tunableDataTable.offsetTable))).to.eql(expectedOffsetTables.tunableData);
      });

      it("player", async () => {
        playerTable.schema = schemaData.player;
        await playerTable.readRecords();
        expect(JSON.parse(JSON.stringify(playerTable.offsetTable))).to.eql(expectedOffsetTables.player);
      });

      it('if schema is incorrect - will auto-override with generic fields', async () => {
        playerTable.schema = schemaData.tunableData;  // incorrect on purpose
        await playerTable.readRecords();
        assertGeneratedSchema(playerTable.offsetTable, expectedOffsetTables.player);
      });

      it('if schema is reset - records will clear', async () => {
        tunableDataTable.schema = schemaData.tunableData;
        await tunableDataTable.readRecords();

        tunableDataTable.schema = schemaData.tunableData;
        expect(tunableDataTable.records).to.be.empty;
        expect(tunableDataTable.offsetTable).to.be.empty;
      });
    });

    describe('without schema', () => {
      it("schedule tunable data", async () => {
        tunableDataTable.schema = null;
        await tunableDataTable.readRecords();
        assertGeneratedSchema(tunableDataTable.offsetTable, expectedOffsetTables.tunableData);        
      });

      it("player", async () => {
        playerTable.schema = null;
        await playerTable.readRecords();
        assertGeneratedSchema(playerTable.offsetTable, expectedOffsetTables.player);
      });
    });
  });
});

