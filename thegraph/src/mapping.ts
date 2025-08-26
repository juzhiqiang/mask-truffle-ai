import { BigInt, Address, store } from "@graphprotocol/graph-ts"
import {
  LogStored,
  LogUpdated,
  LogDeactivated,
  LogReactivated,
  BatchLogStored,
  LogStats as LogStatsEvent
} from "../generated/LogStorage/LogStorage"
import {
  LogEntry,
  User,
  Category,
  UserCategory,
  LogUpdate,
  BatchLogOperation,
  LogStats,
  GlobalStats,
  DailyStats
} from "../generated/schema"

// 辅助函数：获取或创建用户
function getOrCreateUser(address: Address): User {
  let user = User.load(address.toHexString())
  if (user == null) {
    user = new User(address.toHexString())
    user.address = address
    user.totalLogs = BigInt.fromI32(0)
    user.activeLogs = BigInt.fromI32(0)
    user.save()
    
    // 更新全局统计
    updateGlobalStats()
  }
  return user as User
}

// 辅助函数：获取或创建分类
function getOrCreateCategory(name: string): Category {
  let category = Category.load(name)
  if (category == null) {
    category = new Category(name)
    category.name = name
    category.totalLogs = BigInt.fromI32(0)
    category.activeLogs = BigInt.fromI32(0)
    category.save()
    
    // 更新全局统计
    updateGlobalStats()
  }
  return category as Category
}

// 辅助函数：获取或创建用户分类关系
function getOrCreateUserCategory(userId: string, categoryId: string): UserCategory {
  let id = userId + "-" + categoryId
  let userCategory = UserCategory.load(id)
  if (userCategory == null) {
    userCategory = new UserCategory(id)
    userCategory.user = userId
    userCategory.category = categoryId
    userCategory.totalLogs = BigInt.fromI32(0)
    userCategory.activeLogs = BigInt.fromI32(0)
    userCategory.save()
  }
  return userCategory as UserCategory
}

// 辅助函数：更新全局统计
function updateGlobalStats(): void {
  let stats = GlobalStats.load("global")
  if (stats == null) {
    stats = new GlobalStats("global")
    stats.totalLogs = BigInt.fromI32(0)
    stats.activeLogs = BigInt.fromI32(0)
    stats.totalUsers = BigInt.fromI32(0)
    stats.totalCategories = BigInt.fromI32(0)
  }
  stats.lastUpdateTimestamp = BigInt.fromI32(0) // Will be set by caller
  stats.lastUpdateBlock = BigInt.fromI32(0) // Will be set by caller
  stats.save()
}

// 辅助函数：日志级别转换
function logLevelToString(level: i32): string {
  if (level == 0) return "DEBUG"
  if (level == 1) return "INFO"
  if (level == 2) return "WARN"
  if (level == 3) return "ERROR"
  if (level == 4) return "FATAL"
  return "INFO" // 默认值
}

// 辅助函数：更新日常统计
function updateDailyStats(timestamp: BigInt, level: i32): void {
  // 转换时间戳为日期字符串 (YYYY-MM-DD)
  let date = new Date(timestamp.toI32() * 1000)
  let dateString = date.getFullYear().toString() + "-" + 
    (date.getMonth() + 1).toString().padStart(2, "0") + "-" +
    date.getDate().toString().padStart(2, "0")
  
  let stats = DailyStats.load(dateString)
  if (stats == null) {
    stats = new DailyStats(dateString)
    stats.date = dateString
    stats.totalLogs = BigInt.fromI32(0)
    stats.activeLogs = BigInt.fromI32(0)
    stats.uniqueUsers = BigInt.fromI32(0)
    stats.uniqueCategories = BigInt.fromI32(0)
    stats.debugLogs = BigInt.fromI32(0)
    stats.infoLogs = BigInt.fromI32(0)
    stats.warnLogs = BigInt.fromI32(0)
    stats.errorLogs = BigInt.fromI32(0)
    stats.fatalLogs = BigInt.fromI32(0)
  }
  
  stats.totalLogs = stats.totalLogs.plus(BigInt.fromI32(1))
  stats.activeLogs = stats.activeLogs.plus(BigInt.fromI32(1))
  
  // 根据级别更新计数
  if (level == 0) {
    stats.debugLogs = stats.debugLogs.plus(BigInt.fromI32(1))
  } else if (level == 1) {
    stats.infoLogs = stats.infoLogs.plus(BigInt.fromI32(1))
  } else if (level == 2) {
    stats.warnLogs = stats.warnLogs.plus(BigInt.fromI32(1))
  } else if (level == 3) {
    stats.errorLogs = stats.errorLogs.plus(BigInt.fromI32(1))
  } else if (level == 4) {
    stats.fatalLogs = stats.fatalLogs.plus(BigInt.fromI32(1))
  }
  
  stats.save()
}

// 事件处理：日志存储
export function handleLogStored(event: LogStored): void {
  let logEntry = new LogEntry(event.params.id.toString())
  logEntry.logId = event.params.id
  logEntry.creator = event.params.creator.toHexString()
  logEntry.level = logLevelToString(event.params.level)
  logEntry.category = event.params.category
  logEntry.message = event.params.message
  logEntry.metadata = ""
  logEntry.timestamp = event.params.timestamp
  logEntry.blockNumber = event.params.blockNumber
  logEntry.blockTimestamp = event.block.timestamp
  logEntry.transactionHash = event.transaction.hash
  logEntry.isActive = true
  
  // 创建或更新用户
  let user = getOrCreateUser(event.params.creator)
  user.totalLogs = user.totalLogs.plus(BigInt.fromI32(1))
  user.activeLogs = user.activeLogs.plus(BigInt.fromI32(1))
  if (user.firstLogTimestamp == null) {
    user.firstLogTimestamp = event.params.timestamp
  }
  user.lastLogTimestamp = event.params.timestamp
  user.save()
  
  // 创建或更新分类
  let category = getOrCreateCategory(event.params.category)
  category.totalLogs = category.totalLogs.plus(BigInt.fromI32(1))
  category.activeLogs = category.activeLogs.plus(BigInt.fromI32(1))
  if (category.firstLogTimestamp == null) {
    category.firstLogTimestamp = event.params.timestamp
  }
  category.lastLogTimestamp = event.params.timestamp
  category.save()
  
  // 创建或更新用户分类关系
  let userCategory = getOrCreateUserCategory(user.id, category.id)
  userCategory.totalLogs = userCategory.totalLogs.plus(BigInt.fromI32(1))
  userCategory.activeLogs = userCategory.activeLogs.plus(BigInt.fromI32(1))
  if (userCategory.firstLogTimestamp == null) {
    userCategory.firstLogTimestamp = event.params.timestamp
  }
  userCategory.lastLogTimestamp = event.params.timestamp
  userCategory.save()
  
  logEntry.save()
  
  // 更新统计
  updateDailyStats(event.params.timestamp, event.params.level)
  
  // 更新全局统计
  let globalStats = GlobalStats.load("global")
  if (globalStats == null) {
    globalStats = new GlobalStats("global")
    globalStats.totalLogs = BigInt.fromI32(0)
    globalStats.activeLogs = BigInt.fromI32(0)
    globalStats.totalUsers = BigInt.fromI32(0)
    globalStats.totalCategories = BigInt.fromI32(0)
  }
  globalStats.totalLogs = globalStats.totalLogs.plus(BigInt.fromI32(1))
  globalStats.activeLogs = globalStats.activeLogs.plus(BigInt.fromI32(1))
  globalStats.lastUpdateTimestamp = event.block.timestamp
  globalStats.lastUpdateBlock = event.block.number
  globalStats.save()
}

// 事件处理：日志更新
export function handleLogUpdated(event: LogUpdated): void {
  let logUpdate = new LogUpdate(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  )
  logUpdate.logEntry = event.params.id.toString()
  logUpdate.updater = event.params.updater.toHexString()
  logUpdate.newMessage = event.params.newMessage
  logUpdate.newMetadata = event.params.newMetadata
  logUpdate.timestamp = event.params.timestamp
  logUpdate.blockNumber = event.block.number
  logUpdate.blockTimestamp = event.block.timestamp
  logUpdate.transactionHash = event.transaction.hash
  logUpdate.save()
  
  // 更新原日志条目
  let logEntry = LogEntry.load(event.params.id.toString())
  if (logEntry != null) {
    logEntry.message = event.params.newMessage
    logEntry.metadata = event.params.newMetadata
    logEntry.save()
  }
  
  // 确保更新者用户存在
  getOrCreateUser(event.params.updater)
}

// 事件处理：日志停用
export function handleLogDeactivated(event: LogDeactivated): void {
  let logEntry = LogEntry.load(event.params.id.toString())
  if (logEntry != null) {
    logEntry.isActive = false
    logEntry.save()
    
    // 更新用户统计
    let user = User.load(logEntry.creator)
    if (user != null) {
      user.activeLogs = user.activeLogs.minus(BigInt.fromI32(1))
      user.save()
    }
    
    // 更新分类统计
    let category = Category.load(logEntry.category)
    if (category != null) {
      category.activeLogs = category.activeLogs.minus(BigInt.fromI32(1))
      category.save()
    }
    
    // 更新用户分类统计
    let userCategory = UserCategory.load(logEntry.creator + "-" + logEntry.category)
    if (userCategory != null) {
      userCategory.activeLogs = userCategory.activeLogs.minus(BigInt.fromI32(1))
      userCategory.save()
    }
    
    // 更新全局统计
    let globalStats = GlobalStats.load("global")
    if (globalStats != null) {
      globalStats.activeLogs = globalStats.activeLogs.minus(BigInt.fromI32(1))
      globalStats.lastUpdateTimestamp = event.block.timestamp
      globalStats.lastUpdateBlock = event.block.number
      globalStats.save()
    }
  }
  
  // 确保停用者用户存在
  getOrCreateUser(event.params.deactivator)
}

// 事件处理：日志重新激活
export function handleLogReactivated(event: LogReactivated): void {
  let logEntry = LogEntry.load(event.params.id.toString())
  if (logEntry != null) {
    logEntry.isActive = true
    logEntry.save()
    
    // 更新用户统计
    let user = User.load(logEntry.creator)
    if (user != null) {
      user.activeLogs = user.activeLogs.plus(BigInt.fromI32(1))
      user.save()
    }
    
    // 更新分类统计
    let category = Category.load(logEntry.category)
    if (category != null) {
      category.activeLogs = category.activeLogs.plus(BigInt.fromI32(1))
      category.save()
    }
    
    // 更新用户分类统计
    let userCategory = UserCategory.load(logEntry.creator + "-" + logEntry.category)
    if (userCategory != null) {
      userCategory.activeLogs = userCategory.activeLogs.plus(BigInt.fromI32(1))
      userCategory.save()
    }
    
    // 更新全局统计
    let globalStats = GlobalStats.load("global")
    if (globalStats != null) {
      globalStats.activeLogs = globalStats.activeLogs.plus(BigInt.fromI32(1))
      globalStats.lastUpdateTimestamp = event.block.timestamp
      globalStats.lastUpdateBlock = event.block.number
      globalStats.save()
    }
  }
  
  // 确保重新激活者用户存在
  getOrCreateUser(event.params.reactivator)
}

// 事件处理：批量日志存储
export function handleBatchLogStored(event: BatchLogStored): void {
  let batchOperation = new BatchLogOperation(event.transaction.hash.toHexString())
  batchOperation.creator = event.params.creator.toHexString()
  batchOperation.logIds = event.params.ids
  batchOperation.count = event.params.count
  batchOperation.timestamp = event.params.timestamp
  batchOperation.blockNumber = event.block.number
  batchOperation.blockTimestamp = event.block.timestamp
  batchOperation.transactionHash = event.transaction.hash
  batchOperation.save()
  
  // 确保创建者用户存在
  getOrCreateUser(event.params.creator)
}

// 事件处理：日志统计查询
export function handleLogStats(event: LogStatsEvent): void {
  let logStats = new LogStats(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  )
  logStats.totalLogs = event.params.totalLogs
  logStats.activeLogs = event.params.activeLogs
  logStats.queriedBy = event.params.queriedBy.toHexString()
  logStats.timestamp = event.params.timestamp
  logStats.blockNumber = event.block.number
  logStats.blockTimestamp = event.block.timestamp
  logStats.transactionHash = event.transaction.hash
  logStats.save()
  
  // 确保查询者用户存在
  getOrCreateUser(event.params.queriedBy)
}