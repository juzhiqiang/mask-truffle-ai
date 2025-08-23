// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title DataStorage
 * @dev 区块链数据存储和查询合约
 */
contract DataStorage is Ownable, ReentrancyGuard {
    struct DataRecord {
        uint256 id;
        string dataType;
        string content;
        address creator;
        uint256 timestamp;
        bool isActive;
    }
    
    struct QueryFilter {
        string dataType;
        address creator;
        uint256 startTime;
        uint256 endTime;
    }
    
    // 存储所有数据记录
    mapping(uint256 => DataRecord) public dataRecords;
    // 数据类型到记录ID的映射
    mapping(string => uint256[]) public typeToRecords;
    // 创建者到记录ID的映射
    mapping(address => uint256[]) public creatorToRecords;
    
    uint256 public nextRecordId = 1;
    uint256 public totalRecords = 0;
    
    // 事件
    event DataStored(uint256 indexed id, string dataType, address indexed creator, uint256 timestamp);
    event DataUpdated(uint256 indexed id, string newContent, uint256 timestamp);
    event DataDeactivated(uint256 indexed id, uint256 timestamp);
    
    constructor() {
        // 初始化一些示例数据
        _storeData("transaction", "Sample transaction data", msg.sender);
        _storeData("contract", "Sample contract data", msg.sender);
        _storeData("user", "Sample user data", msg.sender);
    }
    
    /**
     * @dev 存储数据到区块链
     * @param dataType 数据类型
     * @param content 数据内容
     */
    function storeData(string memory dataType, string memory content) public nonReentrant {
        _storeData(dataType, content, msg.sender);
    }
    
    /**
     * @dev 内部存储数据函数
     */
    function _storeData(string memory dataType, string memory content, address creator) internal {
        require(bytes(dataType).length > 0, "Data type cannot be empty");
        require(bytes(content).length > 0, "Content cannot be empty");
        
        uint256 recordId = nextRecordId;
        
        dataRecords[recordId] = DataRecord({
            id: recordId,
            dataType: dataType,
            content: content,
            creator: creator,
            timestamp: block.timestamp,
            isActive: true
        });
        
        typeToRecords[dataType].push(recordId);
        creatorToRecords[creator].push(recordId);
        
        nextRecordId++;
        totalRecords++;
        
        emit DataStored(recordId, dataType, creator, block.timestamp);
    }
    
    /**
     * @dev 更新数据记录
     * @param recordId 记录ID
     * @param newContent 新内容
     */
    function updateData(uint256 recordId, string memory newContent) public nonReentrant {
        require(recordId < nextRecordId, "Record does not exist");
        require(dataRecords[recordId].creator == msg.sender || owner() == msg.sender, "Not authorized");
        require(dataRecords[recordId].isActive, "Record is not active");
        require(bytes(newContent).length > 0, "Content cannot be empty");
        
        dataRecords[recordId].content = newContent;
        
        emit DataUpdated(recordId, newContent, block.timestamp);
    }
    
    /**
     * @dev 停用数据记录
     * @param recordId 记录ID
     */
    function deactivateData(uint256 recordId) public nonReentrant {
        require(recordId < nextRecordId, "Record does not exist");
        require(dataRecords[recordId].creator == msg.sender || owner() == msg.sender, "Not authorized");
        require(dataRecords[recordId].isActive, "Record already inactive");
        
        dataRecords[recordId].isActive = false;
        
        emit DataDeactivated(recordId, block.timestamp);
    }
    
    /**
     * @dev 根据ID查询数据记录
     * @param recordId 记录ID
     */
    function getDataRecord(uint256 recordId) public view returns (DataRecord memory) {
        require(recordId < nextRecordId, "Record does not exist");
        return dataRecords[recordId];
    }
    
    /**
     * @dev 根据数据类型查询记录ID列表
     * @param dataType 数据类型
     */
    function getRecordsByType(string memory dataType) public view returns (uint256[] memory) {
        return typeToRecords[dataType];
    }
    
    /**
     * @dev 根据创建者查询记录ID列表
     * @param creator 创建者地址
     */
    function getRecordsByCreator(address creator) public view returns (uint256[] memory) {
        return creatorToRecords[creator];
    }
    
    /**
     * @dev 分页查询所有活跃的数据记录
     * @param offset 偏移量
     * @param limit 限制数量
     */
    function getActiveRecords(uint256 offset, uint256 limit) public view returns (DataRecord[] memory) {
        require(limit > 0 && limit <= 100, "Invalid limit");
        
        uint256 activeCount = 0;
        // 首先计算活跃记录数量
        for (uint256 i = 1; i < nextRecordId; i++) {
            if (dataRecords[i].isActive) {
                activeCount++;
            }
        }
        
        if (offset >= activeCount) {
            return new DataRecord[](0);
        }
        
        uint256 end = offset + limit;
        if (end > activeCount) {
            end = activeCount;
        }
        
        DataRecord[] memory records = new DataRecord[](end - offset);
        uint256 currentIndex = 0;
        uint256 foundCount = 0;
        
        for (uint256 i = 1; i < nextRecordId && currentIndex < records.length; i++) {
            if (dataRecords[i].isActive) {
                if (foundCount >= offset) {
                    records[currentIndex] = dataRecords[i];
                    currentIndex++;
                }
                foundCount++;
            }
        }
        
        return records;
    }
    
    /**
     * @dev 获取统计信息
     */
    function getStats() public view returns (
        uint256 total,
        uint256 active,
        uint256 totalTypes
    ) {
        uint256 activeCount = 0;
        for (uint256 i = 1; i < nextRecordId; i++) {
            if (dataRecords[i].isActive) {
                activeCount++;
            }
        }
        
        return (totalRecords, activeCount, nextRecordId - 1);
    }
}
