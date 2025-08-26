// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title DataLogContract
 * @dev 专门用于数据上链的合约，通过事件日志将数据存储到区块链
 * @notice 这个合约专门处理数据上链功能，通过事件日志的形式将数据永久存储到区块链上
 */
contract DataLogContract is Ownable, ReentrancyGuard {
    
    // 数据日志结构体
    struct DataLog {
        uint256 logId;
        address creator;
        string dataType;
        string content;
        uint256 timestamp;
        bytes32 dataHash;
    }
    
    // 存储日志计数器
    uint256 public nextLogId = 1;
    
    // 用户日志映射
    mapping(address => uint256[]) public userLogs;
    
    // 数据类型日志映射
    mapping(string => uint256[]) public typeToLogs;
    
    // 日志ID到日志数据的映射（可选存储，主要依赖事件）
    mapping(uint256 => DataLog) public logs;
    
    // 事件定义 - 主要的数据存储方式
    event DataStored(
        uint256 indexed logId,
        address indexed creator,
        string indexed dataType,
        string content,
        uint256 timestamp,
        bytes32 dataHash
    );
    
    event BatchDataStored(
        uint256[] logIds,
        address indexed creator,
        string indexed dataType,
        uint256 timestamp
    );
    
    /**
     * @dev 上传单条数据到链上
     * @param dataType 数据类型 (如: "transaction", "log", "metadata", "json")
     * @param content 要存储的数据内容
     */
    function storeData(
        string memory dataType, 
        string memory content
    ) public nonReentrant returns (uint256 logId) {
        require(bytes(dataType).length > 0, "Data type cannot be empty");
        require(bytes(content).length > 0, "Content cannot be empty");
        require(bytes(content).length <= 10000, "Content too large"); // 限制单次存储大小
        
        logId = nextLogId;
        uint256 timestamp = block.timestamp;
        bytes32 dataHash = keccak256(abi.encodePacked(dataType, content, msg.sender, timestamp));
        
        // 创建数据日志
        DataLog memory newLog = DataLog({
            logId: logId,
            creator: msg.sender,
            dataType: dataType,
            content: content,
            timestamp: timestamp,
            dataHash: dataHash
        });
        
        // 存储到映射（可选，主要依赖事件）
        logs[logId] = newLog;
        userLogs[msg.sender].push(logId);
        typeToLogs[dataType].push(logId);
        
        // 发出事件 - 主要的数据存储方式
        emit DataStored(
            logId,
            msg.sender,
            dataType,
            content,
            timestamp,
            dataHash
        );
        
        nextLogId++;
        
        return logId;
    }
    
    /**
     * @dev 批量上传数据到链上
     * @param dataType 数据类型
     * @param contents 要存储的数据内容数组
     */
    function storeBatchData(
        string memory dataType,
        string[] memory contents
    ) public nonReentrant returns (uint256[] memory logIds) {
        require(bytes(dataType).length > 0, "Data type cannot be empty");
        require(contents.length > 0, "Contents cannot be empty");
        require(contents.length <= 50, "Batch size too large"); // 限制批量大小
        
        logIds = new uint256[](contents.length);
        uint256 timestamp = block.timestamp;
        
        for (uint i = 0; i < contents.length; i++) {
            require(bytes(contents[i]).length > 0, "Content cannot be empty");
            require(bytes(contents[i]).length <= 10000, "Content too large");
            
            uint256 logId = nextLogId;
            bytes32 dataHash = keccak256(abi.encodePacked(dataType, contents[i], msg.sender, timestamp, i));
            
            // 创建数据日志
            DataLog memory newLog = DataLog({
                logId: logId,
                creator: msg.sender,
                dataType: dataType,
                content: contents[i],
                timestamp: timestamp,
                dataHash: dataHash
            });
            
            logs[logId] = newLog;
            userLogs[msg.sender].push(logId);
            typeToLogs[dataType].push(logId);
            
            // 发出单独的事件
            emit DataStored(
                logId,
                msg.sender,
                dataType,
                contents[i],
                timestamp,
                dataHash
            );
            
            logIds[i] = logId;
            nextLogId++;
        }
        
        // 发出批量事件
        emit BatchDataStored(logIds, msg.sender, dataType, timestamp);
        
        return logIds;
    }
    
    /**
     * @dev 存储JSON格式数据
     * @param jsonData JSON格式的数据
     */
    function storeJSON(string memory jsonData) public nonReentrant returns (uint256) {
        return storeData("json", jsonData);
    }
    
    /**
     * @dev 存储交易相关数据
     * @param transactionData 交易数据
     */
    function storeTransactionData(string memory transactionData) public nonReentrant returns (uint256) {
        return storeData("transaction", transactionData);
    }
    
    /**
     * @dev 存储应用日志数据
     * @param logData 日志数据
     */
    function storeLogData(string memory logData) public nonReentrant returns (uint256) {
        return storeData("log", logData);
    }
    
    /**
     * @dev 获取指定日志ID的数据（从合约存储读取）
     * @param logId 日志ID
     */
    function getLogData(uint256 logId) public view returns (DataLog memory) {
        require(logId > 0 && logId < nextLogId, "Invalid log ID");
        return logs[logId];
    }
    
    /**
     * @dev 获取用户的所有日志ID
     * @param user 用户地址
     */
    function getUserLogIds(address user) public view returns (uint256[] memory) {
        return userLogs[user];
    }
    
    /**
     * @dev 获取指定数据类型的所有日志ID
     * @param dataType 数据类型
     */
    function getLogIdsByType(string memory dataType) public view returns (uint256[] memory) {
        return typeToLogs[dataType];
    }
    
    /**
     * @dev 验证数据完整性
     * @param logId 日志ID
     * @param expectedHash 期望的哈希值
     */
    function verifyDataIntegrity(uint256 logId, bytes32 expectedHash) public view returns (bool) {
        require(logId > 0 && logId < nextLogId, "Invalid log ID");
        return logs[logId].dataHash == expectedHash;
    }
    
    /**
     * @dev 获取合约统计信息
     */
    function getStats() public view returns (
        uint256 totalLogs,
        uint256 totalUsers,
        address contractAddress
    ) {
        totalLogs = nextLogId - 1;
        
        // 简单统计用户数（通过遍历，实际应用中可优化）
        totalUsers = 0;
        for (uint256 i = 1; i < nextLogId; i++) {
            if (logs[i].creator != address(0)) {
                totalUsers++; // 这里只是示例，实际应该去重计算
            }
        }
        
        contractAddress = address(this);
        
        return (totalLogs, totalUsers, contractAddress);
    }
    
    /**
     * @dev 分页获取日志数据
     * @param offset 偏移量
     * @param limit 限制数量
     */
    function getLogsPaginated(uint256 offset, uint256 limit) 
        public 
        view 
        returns (DataLog[] memory) 
    {
        require(limit > 0 && limit <= 100, "Invalid limit");
        
        uint256 total = nextLogId - 1;
        if (offset >= total) {
            return new DataLog[](0);
        }
        
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        
        DataLog[] memory result = new DataLog[](end - offset);
        
        for (uint256 i = 0; i < end - offset; i++) {
            result[i] = logs[offset + i + 1]; // logId从1开始
        }
        
        return result;
    }
}