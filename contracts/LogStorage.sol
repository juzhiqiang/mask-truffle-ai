// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title LogStorage
 * @dev 专门用于链上日志存储的智能合约，优化了事件结构以支持The Graph索引
 */
contract LogStorage is Ownable, ReentrancyGuard, Pausable {
    
    // 日志级别枚举
    enum LogLevel {
        DEBUG,    // 0
        INFO,     // 1  
        WARN,     // 2
        ERROR,    // 3
        FATAL     // 4
    }
    
    // 日志结构
    struct LogEntry {
        uint256 id;
        address creator;
        LogLevel level;
        string category;
        string message;
        string metadata;
        uint256 timestamp;
        uint256 blockNumber;
        bool isActive;
    }
    
    // 状态变量
    uint256 public nextLogId = 1;
    uint256 public totalLogs = 0;
    uint256 public activeLogs = 0;
    
    // 存储映射
    mapping(uint256 => LogEntry) public logs;
    mapping(address => uint256[]) public userLogs;
    mapping(string => uint256[]) public categoryLogs;
    mapping(LogLevel => uint256[]) public levelLogs;
    
    // 事件定义 - 优化用于The Graph索引
    event LogStored(
        uint256 indexed id,
        address indexed creator,
        LogLevel indexed level,
        string category,
        string message,
        uint256 timestamp,
        uint256 blockNumber
    );
    
    event LogUpdated(
        uint256 indexed id,
        address indexed updater,
        string newMessage,
        string newMetadata,
        uint256 timestamp
    );
    
    event LogDeactivated(
        uint256 indexed id,
        address indexed deactivator,
        uint256 timestamp
    );
    
    event LogReactivated(
        uint256 indexed id,
        address indexed reactivator,
        uint256 timestamp
    );
    
    // 批量操作事件
    event BatchLogStored(
        uint256[] indexed ids,
        address indexed creator,
        uint256 count,
        uint256 timestamp
    );
    
    // 统计事件
    event LogStats(
        uint256 totalLogs,
        uint256 activeLogs,
        address indexed queriedBy,
        uint256 timestamp
    );
    
    constructor() {
        // 存储一些示例日志数据
        _storeLog(msg.sender, LogLevel.INFO, "system", "LogStorage contract deployed", "version=1.0.0");
        _storeLog(msg.sender, LogLevel.DEBUG, "deployment", "Contract initialization completed", "gas_used=estimated");
    }
    
    /**
     * @dev 存储单个日志条目
     * @param level 日志级别
     * @param category 日志分类
     * @param message 日志消息
     * @param metadata 元数据（可选）
     */
    function storeLog(
        LogLevel level,
        string memory category,
        string memory message,
        string memory metadata
    ) public whenNotPaused nonReentrant returns (uint256) {
        return _storeLog(msg.sender, level, category, message, metadata);
    }
    
    /**
     * @dev 批量存储日志条目
     * @param entries 日志条目数组
     */
    function storeBatchLogs(LogEntryInput[] memory entries) 
        public 
        whenNotPaused 
        nonReentrant 
        returns (uint256[] memory) 
    {
        require(entries.length > 0, "Empty entries array");
        require(entries.length <= 50, "Batch size too large"); // 限制批量大小
        
        uint256[] memory logIds = new uint256[](entries.length);
        
        for (uint256 i = 0; i < entries.length; i++) {
            logIds[i] = _storeLog(
                msg.sender,
                entries[i].level,
                entries[i].category,
                entries[i].message,
                entries[i].metadata
            );
        }
        
        emit BatchLogStored(logIds, msg.sender, entries.length, block.timestamp);
        return logIds;
    }
    
    /**
     * @dev 更新日志条目
     * @param logId 日志ID
     * @param newMessage 新消息
     * @param newMetadata 新元数据
     */
    function updateLog(
        uint256 logId,
        string memory newMessage,
        string memory newMetadata
    ) public whenNotPaused nonReentrant {
        require(logId < nextLogId, "Log does not exist");
        require(logs[logId].creator == msg.sender || owner() == msg.sender, "Not authorized");
        require(logs[logId].isActive, "Log is not active");
        require(bytes(newMessage).length > 0, "Message cannot be empty");
        
        logs[logId].message = newMessage;
        logs[logId].metadata = newMetadata;
        
        emit LogUpdated(logId, msg.sender, newMessage, newMetadata, block.timestamp);
    }
    
    /**
     * @dev 停用日志条目
     * @param logId 日志ID
     */
    function deactivateLog(uint256 logId) public whenNotPaused nonReentrant {
        require(logId < nextLogId, "Log does not exist");
        require(logs[logId].creator == msg.sender || owner() == msg.sender, "Not authorized");
        require(logs[logId].isActive, "Log already inactive");
        
        logs[logId].isActive = false;
        activeLogs--;
        
        emit LogDeactivated(logId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev 重新激活日志条目 (仅管理员)
     * @param logId 日志ID
     */
    function reactivateLog(uint256 logId) public onlyOwner whenNotPaused nonReentrant {
        require(logId < nextLogId, "Log does not exist");
        require(!logs[logId].isActive, "Log already active");
        
        logs[logId].isActive = true;
        activeLogs++;
        
        emit LogReactivated(logId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev 获取日志条目
     * @param logId 日志ID
     */
    function getLog(uint256 logId) public view returns (LogEntry memory) {
        require(logId < nextLogId, "Log does not exist");
        return logs[logId];
    }
    
    /**
     * @dev 获取用户的所有日志ID
     * @param user 用户地址
     */
    function getUserLogs(address user) public view returns (uint256[] memory) {
        return userLogs[user];
    }
    
    /**
     * @dev 根据分类获取日志ID
     * @param category 分类
     */
    function getLogsByCategory(string memory category) public view returns (uint256[] memory) {
        return categoryLogs[category];
    }
    
    /**
     * @dev 根据级别获取日志ID
     * @param level 日志级别
     */
    function getLogsByLevel(LogLevel level) public view returns (uint256[] memory) {
        return levelLogs[level];
    }
    
    /**
     * @dev 分页获取活跃日志
     * @param offset 偏移量
     * @param limit 限制数量
     */
    function getActiveLogs(uint256 offset, uint256 limit) 
        public 
        view 
        returns (LogEntry[] memory, uint256 totalActive) 
    {
        require(limit > 0 && limit <= 100, "Invalid limit");
        
        uint256 activeCount = activeLogs;
        if (offset >= activeCount) {
            return (new LogEntry[](0), activeCount);
        }
        
        uint256 end = offset + limit;
        if (end > activeCount) {
            end = activeCount;
        }
        
        LogEntry[] memory result = new LogEntry[](end - offset);
        uint256 currentIndex = 0;
        uint256 foundCount = 0;
        
        for (uint256 i = 1; i < nextLogId && currentIndex < result.length; i++) {
            if (logs[i].isActive) {
                if (foundCount >= offset) {
                    result[currentIndex] = logs[i];
                    currentIndex++;
                }
                foundCount++;
            }
        }
        
        return (result, activeCount);
    }
    
    /**
     * @dev 高级查询 - 根据多个条件筛选日志
     * @param creator 创建者地址 (address(0) 表示忽略)
     * @param level 日志级别 
     * @param category 分类 (空字符串表示忽略)
     * @param startTime 开始时间戳
     * @param endTime 结束时间戳
     * @param offset 偏移量
     * @param limit 限制数量
     */
    function queryLogs(
        address creator,
        LogLevel level,
        string memory category,
        uint256 startTime,
        uint256 endTime,
        uint256 offset,
        uint256 limit
    ) public view returns (LogEntry[] memory) {
        require(limit > 0 && limit <= 100, "Invalid limit");
        require(startTime <= endTime, "Invalid time range");
        
        // 简化实现，返回匹配条件的日志
        LogEntry[] memory tempResults = new LogEntry[](limit);
        uint256 count = 0;
        uint256 skipped = 0;
        
        for (uint256 i = 1; i < nextLogId && count < limit; i++) {
            LogEntry memory log = logs[i];
            
            // 检查各种筛选条件
            bool matches = log.isActive;
            
            if (matches && creator != address(0)) {
                matches = log.creator == creator;
            }
            
            if (matches && log.level != level && level != LogLevel.DEBUG) {
                // 如果指定了级别且不是DEBUG（用作通配符），则筛选级别
                matches = false;
            }
            
            if (matches && bytes(category).length > 0) {
                matches = keccak256(bytes(log.category)) == keccak256(bytes(category));
            }
            
            if (matches && startTime > 0) {
                matches = log.timestamp >= startTime;
            }
            
            if (matches && endTime > 0) {
                matches = log.timestamp <= endTime;
            }
            
            if (matches) {
                if (skipped >= offset) {
                    tempResults[count] = log;
                    count++;
                } else {
                    skipped++;
                }
            }
        }
        
        // 创建精确大小的数组
        LogEntry[] memory results = new LogEntry[](count);
        for (uint256 i = 0; i < count; i++) {
            results[i] = tempResults[i];
        }
        
        return results;
    }
    
    /**
     * @dev 获取统计信息
     */
    function getStats() public returns (uint256, uint256, uint256) {
        emit LogStats(totalLogs, activeLogs, msg.sender, block.timestamp);
        return (totalLogs, activeLogs, nextLogId - 1);
    }
    
    /**
     * @dev 紧急暂停合约 (仅管理员)
     */
    function pause() public onlyOwner {
        _pause();
    }
    
    /**
     * @dev 恢复合约 (仅管理员)
     */
    function unpause() public onlyOwner {
        _unpause();
    }
    
    /**
     * @dev 内部存储日志函数
     */
    function _storeLog(
        address creator,
        LogLevel level,
        string memory category,
        string memory message,
        string memory metadata
    ) internal returns (uint256) {
        require(bytes(category).length > 0, "Category cannot be empty");
        require(bytes(message).length > 0, "Message cannot be empty");
        require(bytes(message).length <= 1000, "Message too long");
        require(bytes(metadata).length <= 500, "Metadata too long");
        
        uint256 logId = nextLogId;
        
        logs[logId] = LogEntry({
            id: logId,
            creator: creator,
            level: level,
            category: category,
            message: message,
            metadata: metadata,
            timestamp: block.timestamp,
            blockNumber: block.number,
            isActive: true
        });
        
        // 更新索引
        userLogs[creator].push(logId);
        categoryLogs[category].push(logId);
        levelLogs[level].push(logId);
        
        // 更新计数器
        nextLogId++;
        totalLogs++;
        activeLogs++;
        
        emit LogStored(logId, creator, level, category, message, block.timestamp, block.number);
        
        return logId;
    }
}

// 用于批量操作的输入结构
struct LogEntryInput {
    LogStorage.LogLevel level;
    string category;
    string message;
    string metadata;
}