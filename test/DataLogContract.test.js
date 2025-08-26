// 为DataLogContract合约创建的测试文件
const DataLogContract = artifacts.require("DataLogContract");

contract("DataLogContract", (accounts) => {
  let dataLogInstance;
  const owner = accounts[0];
  const user1 = accounts[1];
  const user2 = accounts[2];

  beforeEach(async () => {
    dataLogInstance = await DataLogContract.new({ from: owner });
  });

  describe("Basic Functionality", () => {
    it("should store data correctly", async () => {
      const dataType = "test";
      const content = "This is a test data";
      
      const result = await dataLogInstance.storeData(dataType, content, { from: user1 });
      
      // 检查事件是否正确发出
      assert.equal(result.logs.length, 1, "Should emit one event");
      assert.equal(result.logs[0].event, "DataStored", "Should emit DataStored event");
      assert.equal(result.logs[0].args.logId.toString(), "1", "LogId should be 1");
      assert.equal(result.logs[0].args.creator, user1, "Creator should be user1");
      assert.equal(result.logs[0].args.dataType, dataType, "DataType should match");
      assert.equal(result.logs[0].args.content, content, "Content should match");
      
      // 检查存储的数据
      const storedData = await dataLogInstance.getLogData(1);
      assert.equal(storedData.logId.toString(), "1", "LogId should be 1");
      assert.equal(storedData.creator, user1, "Creator should be user1");
      assert.equal(storedData.dataType, dataType, "DataType should match");
      assert.equal(storedData.content, content, "Content should match");
    });

    it("should handle multiple users", async () => {
      await dataLogInstance.storeData("type1", "data1", { from: user1 });
      await dataLogInstance.storeData("type2", "data2", { from: user2 });
      
      const user1Logs = await dataLogInstance.getUserLogIds(user1);
      const user2Logs = await dataLogInstance.getUserLogIds(user2);
      
      assert.equal(user1Logs.length, 1, "User1 should have 1 log");
      assert.equal(user2Logs.length, 1, "User2 should have 1 log");
      assert.equal(user1Logs[0].toString(), "1", "User1's first log should be ID 1");
      assert.equal(user2Logs[0].toString(), "2", "User2's first log should be ID 2");
    });

    it("should store JSON data", async () => {
      const jsonData = '{"name": "test", "value": 123}';
      
      const result = await dataLogInstance.storeJSON(jsonData, { from: user1 });
      
      assert.equal(result.logs[0].args.dataType, "json", "DataType should be json");
      assert.equal(result.logs[0].args.content, jsonData, "Content should match JSON");
    });

    it("should store batch data", async () => {
      const dataType = "batch";
      const contents = ["data1", "data2", "data3"];
      
      const result = await dataLogInstance.storeBatchData(dataType, contents, { from: user1 });
      
      // 检查是否发出了正确数量的事件
      assert.equal(result.logs.length, 4, "Should emit 4 events (3 DataStored + 1 BatchDataStored)");
      
      // 检查批量事件
      const batchEvent = result.logs.find(log => log.event === "BatchDataStored");
      assert.isNotNull(batchEvent, "Should emit BatchDataStored event");
      assert.equal(batchEvent.args.dataType, dataType, "DataType should match");
      assert.equal(batchEvent.args.creator, user1, "Creator should be user1");
    });
  });

  describe("Validation", () => {
    it("should reject empty data type", async () => {
      try {
        await dataLogInstance.storeData("", "some content", { from: user1 });
        assert.fail("Should reject empty data type");
      } catch (error) {
        assert.include(error.message, "Data type cannot be empty");
      }
    });

    it("should reject empty content", async () => {
      try {
        await dataLogInstance.storeData("test", "", { from: user1 });
        assert.fail("Should reject empty content");
      } catch (error) {
        assert.include(error.message, "Content cannot be empty");
      }
    });

    it("should reject oversized content", async () => {
      const largeContent = "x".repeat(10001); // 超过10000字符限制
      
      try {
        await dataLogInstance.storeData("test", largeContent, { from: user1 });
        assert.fail("Should reject oversized content");
      } catch (error) {
        assert.include(error.message, "Content too large");
      }
    });
  });

  describe("Queries", () => {
    beforeEach(async () => {
      await dataLogInstance.storeData("type1", "content1", { from: user1 });
      await dataLogInstance.storeData("type2", "content2", { from: user1 });
      await dataLogInstance.storeData("type1", "content3", { from: user2 });
    });

    it("should get logs by type", async () => {
      const type1Logs = await dataLogInstance.getLogIdsByType("type1");
      const type2Logs = await dataLogInstance.getLogIdsByType("type2");
      
      assert.equal(type1Logs.length, 2, "Should have 2 type1 logs");
      assert.equal(type2Logs.length, 1, "Should have 1 type2 log");
    });

    it("should get paginated logs", async () => {
      const logs = await dataLogInstance.getLogsPaginated(0, 2);
      
      assert.equal(logs.length, 2, "Should return 2 logs");
      assert.equal(logs[0].logId.toString(), "1", "First log should be ID 1");
      assert.equal(logs[1].logId.toString(), "2", "Second log should be ID 2");
    });

    it("should get contract statistics", async () => {
      const stats = await dataLogInstance.getStats();
      
      assert.equal(stats.totalLogs.toString(), "3", "Should have 3 total logs");
      assert.equal(stats.contractAddress, dataLogInstance.address, "Should return contract address");
    });
  });
});