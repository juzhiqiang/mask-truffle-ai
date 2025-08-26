import { ethers } from "ethers";

// 增强的日志链上存储合约ABI
const LOG_STORAGE_ABI = [
  {
    "inputs": [
      {"internalType": "uint8", "name": "level", "type": "uint8"},
      {"internalType": "string", "name": "category", "type": "string"},
      {"internalType": "string", "name": "message", "type": "string"},
      {"internalType": "string", "name": "metadata", "type": "string"}
    ],
    "name": "storeLog",
    "outputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {"internalType": "uint8", "name": "level", "type": "uint8"},
          {"internalType": "string", "name": "category", "type": "string"},
          {"internalType": "string", "name": "message", "type": "string"},
          {"internalType": "string", "name": "metadata", "type": "string"}
        ],
        "internalType": "struct LogEntryInput[]",
        "name": "entries",
        "type": "tuple[]"
      }
    ],
    "name": "storeBatchLogs",
    "outputs": [
      {"internalType": "uint256[]", "name": "", "type": "uint256[]"}
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "logId", "type": "uint256"}
    ],
    "name": "getLog",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "id", "type": "uint256"},
          {"internalType": "address", "name": "creator", "type": "address"},
          {"internalType": "uint8", "name": "level", "type": "uint8"},
          {"internalType": "string", "name": "category", "type": "string"},
          {"internalType": "string", "name": "message", "type": "string"},
          {"internalType": "string", "name": "metadata", "type": "string"},
          {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
          {"internalType": "uint256", "name": "blockNumber", "type": "uint256"},
          {"internalType": "bool", "name": "isActive", "type": "bool"}
        ],
        "internalType": "struct LogStorage.LogEntry",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "getUserLogs",
    "outputs": [
      {"internalType": "uint256[]", "name": "", "type": "uint256[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getStats",
    "outputs": [
      {"internalType": "uint256", "name": "", "type": "uint256"},
      {"internalType": "uint256", "name": "", "type": "uint256"},
      {"internalType": "uint256", "name": "", "type": "uint256"}
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "uint256", "name": "id", "type": "uint256"},
      {"indexed": true, "internalType": "address", "name": "creator", "type": "address"},
      {"indexed": true, "internalType": "uint8", "name": "level", "type": "uint8"},
      {"indexed": false, "internalType": "string", "name": "category", "type": "string"},
      {"indexed": false, "internalType": "string", "name": "message", "type": "string"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "blockNumber", "type": "uint256"}
    ],
    "name": "LogStored",
    "type": "event"
  }
];

// 日志级别枚举
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
};

// 不同网络的LogStorage合约地址
const LOG_STORAGE_ADDRESSES = {
  'ethereum': '0x0000000000000000000000000000000000000000', // 待部署
  'goerli': '0x0000000000000000000000000000000000000000', // 待部署
  'sepolia': '0x0000000000000000000000000000000000000000', // 待部署
  'hardhat': '0x0000000000000000000000000000000000000000', // 待部署
  'ganache': '0x0000000000000000000000000000000000000000', // 待部署
};

// The Graph端点配置
const GRAPH_ENDPOINTS = {
  'ethereum': 'https://api.thegraph.com/subgraphs/name/your-username/log-storage-mainnet',
  'goerli': 'https://api.thegraph.com/subgraphs/name/your-username/log-storage-goerli',
  'sepolia': 'https://api.thegraph.com/subgraphs/name/your-username/log-storage-sepolia',
  'hardhat': 'http://localhost:8000/subgraphs/name/log-storage-local',
  'ganache': 'http://localhost:8000/subgraphs/name/log-storage-local'
};

class EnhancedLogChainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.graphEndpoint = null;
    this.isInitialized = false;
    this.init();
  }

  async init() {
    try {
      if (typeof window !== "undefined" && window.ethereum) {
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        this.isInitialized = true;
        console.log("Enhanced LogChain service initialized successfully");
      } else {
        console.warn("No Ethereum provider found");
        throw new Error("未检测到以太坊钱包");
      }
    } catch (error) {
      console.error("Failed to initialize Enhanced LogChain service:", error);
      throw error;
    }
  }

  isValidCallback(callback) {
    return callback && typeof callback === 'function';
  }

  async supportsEIP1559() {
    try {
      const network = await this.provider.getNetwork();
      const supportedChains = [1, 5, 11155111, 137, 10, 42161];
      return supportedChains.includes(network.chainId);
    } catch (error) {
      console.warn("检查EIP-1559支持失败, 使用传统交易:", error);
      return false;
    }
  }

  async checkConnection() {
    if (!this.isInitialized) {
      throw new Error("服务未初始化，请先连接钱包");
    }

    if (!window.ethereum) {
      throw new Error("未检测到MetaMask，请安装MetaMask扩展");
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_accounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("请先连接钱包");
      }

      this.signer = this.provider.getSigner();
      return accounts[0];
    } catch (error) {
      console.error("钱包连接检查失败:", error);
      throw new Error(`钱包连接失败: ${error.message}`);
    }
  }

  async getCurrentNetwork() {
    try {
      const network = await this.provider.getNetwork();
      const networkNames = {
        1: 'ethereum',
        5: 'goerli', 
        11155111: 'sepolia',
        31337: 'hardhat',
        1337: 'ganache'
      };
      
      const networkName = networkNames[network.chainId] || 'unknown';
      
      return {
        chainId: network.chainId,
        name: networkName,
        displayName: network.name
      };
    } catch (error) {
      console.error('获取网络信息失败:', error);
      return null;
    }
  }

  async getLogStorageContract() {
    try {
      const network = await this.getCurrentNetwork();
      if (!network) {
        throw new Error('无法获取网络信息');
      }

      const contractAddress = LOG_STORAGE_ADDRESSES[network.name];
      if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error(`当前网络 ${network.displayName} 暂不支持LogStorage合约功能`);
      }

      if (!this.contract || this.contract.address !== contractAddress) {
        this.contract = new ethers.Contract(contractAddress, LOG_STORAGE_ABI, this.signer || this.provider);
      }

      this.graphEndpoint = GRAPH_ENDPOINTS[network.name];
      return this.contract;
    } catch (error) {
      console.error('获取LogStorage合约失败:', error);
      throw error;
    }
  }

  async storeLog(level, category, message, metadata = '', progressCallback = null) {
    try {
      await this.checkConnection();
      
      if (this.isValidCallback(progressCallback)) {
        progressCallback(10, '准备连接LogStorage合约...');
      }

      const contract = await this.getLogStorageContract();
      const contractWithSigner = contract.connect(this.signer);

      if (this.isValidCallback(progressCallback)) {
        progressCallback(30, '验证日志数据...');
      }

      if (!category || category.trim() === '') {
        throw new Error('日志分类不能为空');
      }
      if (!message || message.trim() === '') {
        throw new Error('日志消息不能为空');
      }

      const levelInt = typeof level === 'string' ? LOG_LEVELS[level.toUpperCase()] : level;
      if (levelInt === undefined) {
        throw new Error('无效的日志级别');
      }

      if (this.isValidCallback(progressCallback)) {
        progressCallback(50, '估算Gas费用...');
      }

      let gasEstimate;
      try {
        gasEstimate = await contractWithSigner.estimateGas.storeLog(
          levelInt, 
          category.trim(), 
          message.trim(), 
          metadata.trim()
        );
        gasEstimate = gasEstimate.mul(120).div(100);
      } catch (gasError) {
        console.warn('Gas估算失败，使用默认值:', gasError);
        gasEstimate = ethers.BigNumber.from('300000');
      }

      if (this.isValidCallback(progressCallback)) {
        progressCallback(70, '发送日志上链交易...');
      }

      const txOptions = { gasLimit: gasEstimate };
      
      const supportsEIP1559 = await this.supportsEIP1559();
      if (supportsEIP1559) {
        const feeData = await this.provider.getFeeData();
        txOptions.maxFeePerGas = feeData.maxFeePerGas;
        txOptions.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
      } else {
        const gasPrice = await this.provider.getGasPrice();
        txOptions.gasPrice = gasPrice;
      }

      const tx = await contractWithSigner.storeLog(
        levelInt, 
        category.trim(), 
        message.trim(), 
        metadata.trim(), 
        txOptions
      );
      
      if (this.isValidCallback(progressCallback)) {
        progressCallback(85, '等待交易确认...');
      }

      const receipt = await tx.wait();

      if (this.isValidCallback(progressCallback)) {
        progressCallback(95, '解析交易结果...');
      }

      let logId = null;
      if (receipt.events && receipt.events.length > 0) {
        const logEvent = receipt.events.find(event => event.event === 'LogStored');
        if (logEvent && logEvent.args) {
          logId = logEvent.args.id?.toString();
        }
      }

      if (this.isValidCallback(progressCallback)) {
        progressCallback(100, '日志上链成功！');
      }

      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        logId: logId,
        level: Object.keys(LOG_LEVELS)[levelInt],
        category: category.trim(),
        message: message.trim(),
        metadata: metadata.trim(),
        contractAddress: contract.address,
        inputData: tx.data || '0x'
      };

    } catch (error) {
      console.error('日志上链失败:', error);
      if (this.isValidCallback(progressCallback)) {
        progressCallback(-1, `日志上链失败: ${error.message}`);
      }
      
      let friendlyMessage = error.message;
      if (error.message.includes('当前网络') && error.message.includes('暂不支持')) {
        friendlyMessage = '当前网络暂不支持LogStorage合约功能，请切换到支持的网络';
      } else if (error.message.includes('user rejected')) {
        friendlyMessage = '用户取消了交易';
      } else if (error.message.includes('insufficient funds')) {
        friendlyMessage = 'Gas费用不足，请确保钱包有足够的余额';
      }
      
      throw new Error(friendlyMessage);
    }
  }

  async queryLogsFromGraph(query, variables = {}) {
    try {
      if (!this.graphEndpoint) {
        const network = await this.getCurrentNetwork();
        this.graphEndpoint = GRAPH_ENDPOINTS[network?.name];
      }

      if (!this.graphEndpoint) {
        throw new Error('The Graph端点未配置');
      }

      const response = await fetch(this.graphEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query,
          variables
        })
      });

      if (!response.ok) {
        throw new Error(`Graph查询失败: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.errors && result.errors.length > 0) {
        throw new Error(`Graph查询错误: ${result.errors[0].message}`);
      }

      return result.data;
    } catch (error) {
      console.error('Graph查询失败:', error);
      throw new Error(`查询失败: ${error.message}`);
    }
  }

  async getUserLogsFromGraph(userAddress, limit = 10, skip = 0) {
    const query = `
      query GetUserLogs($user: String!, $limit: Int!, $skip: Int!) {
        logEntries(
          where: { creator: $user, isActive: true }
          orderBy: timestamp
          orderDirection: desc
          first: $limit
          skip: $skip
        ) {
          id
          logId
          creator {
            id
            address
          }
          level
          category
          message
          metadata
          timestamp
          blockNumber
          blockTimestamp
          transactionHash
          isActive
        }
      }
    `;

    try {
      const result = await this.queryLogsFromGraph(query, {
        user: userAddress.toLowerCase(),
        limit,
        skip
      });
      return result.logEntries || [];
    } catch (error) {
      console.warn('Graph查询失败，尝试合约查询:', error);
      return await this.getUserLogsFromContract(userAddress);
    }
  }

  async getLogsByCategoryFromGraph(category, limit = 10, skip = 0) {
    const query = `
      query GetLogsByCategory($category: String!, $limit: Int!, $skip: Int!) {
        logEntries(
          where: { category: $category, isActive: true }
          orderBy: timestamp
          orderDirection: desc
          first: $limit
          skip: $skip
        ) {
          id
          logId
          creator {
            id
            address
          }
          level
          category
          message
          metadata
          timestamp
          blockNumber
          transactionHash
          isActive
        }
      }
    `;

    try {
      const result = await this.queryLogsFromGraph(query, {
        category,
        limit,
        skip
      });
      return result.logEntries || [];
    } catch (error) {
      console.warn('Graph查询失败，尝试合约查询:', error);
      return await this.getLogsByCategoryFromContract(category);
    }
  }

  async getStatsFromGraph() {
    const query = `
      query GetStats {
        globalStats(id: "global") {
          totalLogs
          activeLogs
          totalUsers
          totalCategories
          lastUpdateTimestamp
        }
        dailyStats(orderBy: date, orderDirection: desc, first: 7) {
          date
          totalLogs
          activeLogs
          debugLogs
          infoLogs
          warnLogs
          errorLogs
          fatalLogs
        }
      }
    `;

    try {
      const result = await this.queryLogsFromGraph(query);
      return result;
    } catch (error) {
      console.warn('Graph统计查询失败，尝试合约查询:', error);
      return await this.getStatsFromContract();
    }
  }

  async getLogFromContract(logId) {
    try {
      const contract = await this.getLogStorageContract();
      const logData = await contract.getLog(logId);
      
      return {
        id: logData.id.toString(),
        creator: logData.creator,
        level: Object.keys(LOG_LEVELS)[logData.level],
        category: logData.category,
        message: logData.message,
        metadata: logData.metadata,
        timestamp: logData.timestamp.toNumber(),
        blockNumber: logData.blockNumber.toNumber(),
        isActive: logData.isActive
      };
    } catch (error) {
      console.error('读取合约日志失败:', error);
      throw new Error(`读取日志失败: ${error.message}`);
    }
  }

  async getUserLogsFromContract(userAddress) {
    try {
      const contract = await this.getLogStorageContract();
      const logIds = await contract.getUserLogs(userAddress);
      
      const logs = [];
      for (let i = 0; i < Math.min(logIds.length, 10); i++) {
        try {
          const logData = await this.getLogFromContract(logIds[i].toString());
          logs.push(logData);
        } catch (error) {
          console.warn(`读取日志 ${logIds[i]} 失败:`, error);
        }
      }
      
      return logs;
    } catch (error) {
      console.error('合约查询用户日志失败:', error);
      throw error;
    }
  }

  async getLogsByCategoryFromContract(category) {
    try {
      const contract = await this.getLogStorageContract();
      const logIds = await contract.getLogsByCategory(category);
      
      const logs = [];
      for (let i = 0; i < Math.min(logIds.length, 10); i++) {
        try {
          const logData = await this.getLogFromContract(logIds[i].toString());
          logs.push(logData);
        } catch (error) {
          console.warn(`读取日志 ${logIds[i]} 失败:`, error);
        }
      }
      
      return logs;
    } catch (error) {
      console.error('合约查询分类日志失败:', error);
      throw error;
    }
  }

  async getStatsFromContract() {
    try {
      const contract = await this.getLogStorageContract();
      const contractWithSigner = contract.connect(this.signer);
      const statsData = await contractWithSigner.getStats();
      
      return {
        globalStats: {
          totalLogs: statsData[0].toString(),
          activeLogs: statsData[1].toString(),
          totalUsers: '0',
          totalCategories: '0'
        }
      };
    } catch (error) {
      console.error('合约统计查询失败:', error);
      throw error;
    }
  }

  async isNetworkSupported() {
    try {
      const network = await this.getCurrentNetwork();
      if (!network) return false;
      
      const contractAddress = LOG_STORAGE_ADDRESSES[network.name];
      return contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000';
    } catch (error) {
      console.error('检查网络支持失败:', error);
      return false;
    }
  }

  getSupportedNetworks() {
    return Object.keys(LOG_STORAGE_ADDRESSES)
      .filter(network => LOG_STORAGE_ADDRESSES[network] !== '0x0000000000000000000000000000000000000000')
      .map(network => ({
        name: network,
        contractAddress: LOG_STORAGE_ADDRESSES[network],
        graphEndpoint: GRAPH_ENDPOINTS[network]
      }));
  }

  // 兼容原有接口的方法
  async uploadLogToChain(logData, logType = 'info', progressCallback = null) {
    return await this.storeLog(logType, 'general', logData, '', progressCallback);
  }

  getLogLevels() {
    return Object.keys(LOG_LEVELS);
  }

  formatLogLevel(level) {
    const levelNames = {
      DEBUG: '调试',
      INFO: '信息',
      WARN: '警告',
      ERROR: '错误',
      FATAL: '致命'
    };
    return levelNames[level] || level;
  }
}

export default EnhancedLogChainService;