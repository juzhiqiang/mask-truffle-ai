const DataStorage = artifacts.require("DataStorage");
const { expect } = require('chai');

contract("DataStorage", (accounts) => {
  let dataStorage;
  const owner = accounts[0];
  const user1 = accounts[1];
  const user2 = accounts[2];

  beforeEach(async () => {
    dataStorage = await DataStorage.new({ from: owner });
  });

  describe("Data Storage", () => {
    it("should store data correctly", async () => {
      const dataType = "test";
      const content = "test content";
      
      const result = await dataStorage.storeData(dataType, content, { from: user1 });
      
      // Check event emission
      expect(result.logs[0].event).to.equal("DataStored");
      expect(result.logs[0].args.dataType).to.equal(dataType);
      expect(result.logs[0].args.creator).to.equal(user1);
    });

    it("should retrieve data correctly", async () => {
      const dataType = "test";
      const content = "test content";
      
      await dataStorage.storeData(dataType, content, { from: user1 });
      
      // Get the record ID (should be 4, since constructor creates 3 records)
      const recordId = 4;
      const record = await dataStorage.getDataRecord(recordId);
      
      expect(record.dataType).to.equal(dataType);
      expect(record.content).to.equal(content);
      expect(record.creator).to.equal(user1);
      expect(record.isActive).to.be.true;
    });

    it("should update data correctly", async () => {
      const dataType = "test";
      const content = "test content";
      const newContent = "updated content";
      
      await dataStorage.storeData(dataType, content, { from: user1 });
      const recordId = 4;
      
      await dataStorage.updateData(recordId, newContent, { from: user1 });
      
      const record = await dataStorage.getDataRecord(recordId);
      expect(record.content).to.equal(newContent);
    });

    it("should not allow unauthorized updates", async () => {
      const dataType = "test";
      const content = "test content";
      const newContent = "updated content";
      
      await dataStorage.storeData(dataType, content, { from: user1 });
      const recordId = 4;
      
      try {
        await dataStorage.updateData(recordId, newContent, { from: user2 });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("Not authorized");
      }
    });

    it("should deactivate data correctly", async () => {
      const dataType = "test";
      const content = "test content";
      
      await dataStorage.storeData(dataType, content, { from: user1 });
      const recordId = 4;
      
      await dataStorage.deactivateData(recordId, { from: user1 });
      
      const record = await dataStorage.getDataRecord(recordId);
      expect(record.isActive).to.be.false;
    });

    it("should get records by type", async () => {
      const dataType = "test";
      
      await dataStorage.storeData(dataType, "content1", { from: user1 });
      await dataStorage.storeData(dataType, "content2", { from: user2 });
      
      const records = await dataStorage.getRecordsByType(dataType);
      expect(records.length).to.equal(2);
    });

    it("should get records by creator", async () => {
      await dataStorage.storeData("type1", "content1", { from: user1 });
      await dataStorage.storeData("type2", "content2", { from: user1 });
      
      const records = await dataStorage.getRecordsByCreator(user1);
      expect(records.length).to.equal(2);
    });

    it("should get stats correctly", async () => {
      const stats = await dataStorage.getStats();
      
      // Constructor creates 3 records
      expect(stats.total.toNumber()).to.equal(3);
      expect(stats.active.toNumber()).to.equal(3);
    });

    it("should get active records with pagination", async () => {
      // Constructor already created 3 records
      const records = await dataStorage.getActiveRecords(0, 10);
      expect(records.length).to.equal(3);
    });

    it("should not allow empty data type", async () => {
      try {
        await dataStorage.storeData("", "content", { from: user1 });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("Data type cannot be empty");
      }
    });

    it("should not allow empty content", async () => {
      try {
        await dataStorage.storeData("type", "", { from: user1 });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("Content cannot be empty");
      }
    });
  });
});
