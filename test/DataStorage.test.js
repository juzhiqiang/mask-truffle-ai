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

  describe("Contract Deployment", () => {
    it("should deploy successfully", async () => {
      expect(dataStorage.address).to.not.equal("");
      expect(dataStorage.address).to.not.equal(null);
      expect(dataStorage.address).to.not.equal(undefined);
    });

    it("should initialize with sample data", async () => {
      const stats = await dataStorage.getStats();
      expect(stats.total.toNumber()).to.equal(3);
      expect(stats.active.toNumber()).to.equal(3);
    });
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

  describe("Data Retrieval", () => {
    beforeEach(async () => {
      await dataStorage.storeData("test", "test content", { from: user1 });
    });

    it("should retrieve data correctly", async () => {
      // Get the record ID (should be 4, since constructor creates 3 records)
      const recordId = 4;
      const record = await dataStorage.getDataRecord(recordId);
      
      expect(record.dataType).to.equal("test");
      expect(record.content).to.equal("test content");
      expect(record.creator).to.equal(user1);
      expect(record.isActive).to.be.true;
    });

    it("should not retrieve non-existent data", async () => {
      try {
        await dataStorage.getDataRecord(999);
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("Record does not exist");
      }
    });
  });

  describe("Data Updates", () => {
    let recordId;

    beforeEach(async () => {
      await dataStorage.storeData("test", "test content", { from: user1 });
      recordId = 4; // Fourth record (constructor creates 3)
    });

    it("should update data correctly", async () => {
      const newContent = "updated content";
      
      const result = await dataStorage.updateData(recordId, newContent, { from: user1 });
      
      // Check event emission
      expect(result.logs[0].event).to.equal("DataUpdated");
      expect(result.logs[0].args.id.toNumber()).to.equal(recordId);
      expect(result.logs[0].args.newContent).to.equal(newContent);

      const record = await dataStorage.getDataRecord(recordId);
      expect(record.content).to.equal(newContent);
    });

    it("should not allow unauthorized updates", async () => {
      const newContent = "updated content";
      
      try {
        await dataStorage.updateData(recordId, newContent, { from: user2 });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("Not authorized");
      }
    });

    it("should allow owner to update any record", async () => {
      const newContent = "updated by owner";
      
      await dataStorage.updateData(recordId, newContent, { from: owner });
      
      const record = await dataStorage.getDataRecord(recordId);
      expect(record.content).to.equal(newContent);
    });

    it("should not update with empty content", async () => {
      try {
        await dataStorage.updateData(recordId, "", { from: user1 });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("Content cannot be empty");
      }
    });
  });

  describe("Data Deactivation", () => {
    let recordId;

    beforeEach(async () => {
      await dataStorage.storeData("test", "test content", { from: user1 });
      recordId = 4;
    });

    it("should deactivate data correctly", async () => {
      const result = await dataStorage.deactivateData(recordId, { from: user1 });
      
      // Check event emission
      expect(result.logs[0].event).to.equal("DataDeactivated");
      expect(result.logs[0].args.id.toNumber()).to.equal(recordId);

      const record = await dataStorage.getDataRecord(recordId);
      expect(record.isActive).to.be.false;
    });

    it("should not allow unauthorized deactivation", async () => {
      try {
        await dataStorage.deactivateData(recordId, { from: user2 });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("Not authorized");
      }
    });

    it("should allow owner to deactivate any record", async () => {
      await dataStorage.deactivateData(recordId, { from: owner });
      
      const record = await dataStorage.getDataRecord(recordId);
      expect(record.isActive).to.be.false;
    });

    it("should not deactivate already inactive record", async () => {
      await dataStorage.deactivateData(recordId, { from: user1 });
      
      try {
        await dataStorage.deactivateData(recordId, { from: user1 });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error.message).to.include("Record already inactive");
      }
    });
  });

  describe("Query Functions", () => {
    beforeEach(async () => {
      await dataStorage.storeData("type1", "content1", { from: user1 });
      await dataStorage.storeData("type1", "content2", { from: user2 });
      await dataStorage.storeData("type2", "content3", { from: user1 });
    });

    it("should get records by type", async () => {
      const records = await dataStorage.getRecordsByType("type1");
      expect(records.length).to.equal(2);
      expect(records[0].toNumber()).to.equal(4);
      expect(records[1].toNumber()).to.equal(5);
    });

    it("should get records by creator", async () => {
      const records = await dataStorage.getRecordsByCreator(user1);
      expect(records.length).to.equal(2);
      expect(records[0].toNumber()).to.equal(4);
      expect(records[1].toNumber()).to.equal(6);
    });

    it("should get active records with pagination", async () => {
      const records = await dataStorage.getActiveRecords(0, 10);
      expect(records.length).to.equal(6); // 3 from constructor + 3 from beforeEach
    });

    it("should handle pagination correctly", async () => {
      const records = await dataStorage.getActiveRecords(0, 2);
      expect(records.length).to.equal(2);
    });

    it("should return empty array for out-of-range pagination", async () => {
      const records = await dataStorage.getActiveRecords(100, 10);
      expect(records.length).to.equal(0);
    });
  });

  describe("Statistics", () => {
    it("should return correct stats initially", async () => {
      const stats = await dataStorage.getStats();
      expect(stats.total.toNumber()).to.equal(3);
      expect(stats.active.toNumber()).to.equal(3);
    });

    it("should update stats after adding data", async () => {
      await dataStorage.storeData("test", "content", { from: user1 });
      
      const stats = await dataStorage.getStats();
      expect(stats.total.toNumber()).to.equal(4);
      expect(stats.active.toNumber()).to.equal(4);
    });

    it("should update active count after deactivation", async () => {
      await dataStorage.storeData("test", "content", { from: user1 });
      await dataStorage.deactivateData(4, { from: user1 });
      
      const stats = await dataStorage.getStats();
      expect(stats.total.toNumber()).to.equal(4);
      expect(stats.active.toNumber()).to.equal(3);
    });
  });

  describe("Edge Cases", () => {
    it("should handle large data content", async () => {
      const largeContent = "x".repeat(1000);
      await dataStorage.storeData("large", largeContent, { from: user1 });
      
      const record = await dataStorage.getDataRecord(4);
      expect(record.content).to.equal(largeContent);
    });

    it("should handle special characters in data type", async () => {
      const specialType = "type-with_special.chars";
      await dataStorage.storeData(specialType, "content", { from: user1 });
      
      const record = await dataStorage.getDataRecord(4);
      expect(record.dataType).to.equal(specialType);
    });

    it("should handle multiple records from same creator", async () => {
      for (let i = 0; i < 5; i++) {
        await dataStorage.storeData(`type${i}`, `content${i}`, { from: user1 });
      }
      
      const records = await dataStorage.getRecordsByCreator(user1);
      expect(records.length).to.equal(5);
    });
  });
});
