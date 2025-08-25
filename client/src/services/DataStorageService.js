import { ethers } from 'ethers';

// 合约 ABI - 这应该从编译后的合约中获取
const CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "DataDeactivated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "dataType",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "DataStored",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "dataType",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "content",
        "type": "string"
      }
    ],
    "name": "storeData",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "recordId",
        "type": "uint256"
      }
    ],
    "name": "getDataRecord",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "dataType",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "content",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "creator",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isActive",
            "type": "bool"
          }
        ],
        "internalType": "struct DataStorage.DataRecord",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "offset",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "limit",
        "type": "uint256"
      }
    ],
    "name": "getActiveRecords",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "dataType",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "content",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "creator",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isActive",
            "type": "bool"
          }
        ],
        "internalType": "struct DataStorage.DataRecord[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "dataType",
        "type": "string"
      }
    ],
    "name": "getRecordsByType",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "creator",
        "type": "address"
      }
    ],
    "name": "getRecordsByCreator",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getStats",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "total",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "active",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalTypes",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// 合约地址 - 部署后需要更新
// 注意：这里使用一个示例地址，实际部署后需要替换
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

class DataStorageService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.signer = null;
    this.isInitialized = false;
    this.init();
  }

  async init() {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.provider);
        this.isInitialized = true;
        console.log('DataStorage service initialized successfully');
      } else {
        console.warn('No Ethereum provider found');
        throw new Error('未检测到以太坊钱包');
      }
    } catch (error) {
      console.error('Failed to initialize DataStorage service:', error);
      throw error;
    }
  }

  async checkConnection() {
    if (!this.isInitialized) {
      throw new Error('服务未初始化，请先连接钱包');
    }

    if (!window.ethereum) {
      throw new Error('未检测到MetaMask，请安装MetaMask扩展');
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('请先连接钱包');
      }
      return true;
    } catch (error) {
      throw new Error('钱包连接检查失败：' + error.message);
    }
  }

  async getSigner() {
    await this.checkConnection();
    
    if (!this.signer && this.provider) {
      try {
        this.signer = this.provider.getSigner();
        this.contract = this.contract.connect(this.signer);
        
        // 验证signer是否可用
        const address = await this.signer.getAddress();
        console.log('Signer connected:', address);
      } catch (error) {
        console.error('Failed to get signer:', error);
        throw new Error('获取钱包签名器失败：' + error.message);
      }
    }
    return this.signer;
  }

  async storeData(dataType, content, progressCallback = null) {
    try {
      // 进度回调：准备阶段
      if (progressCallback) {
        progressCallback(15, '正在获取钱包签名器...');
      }

      await this.getSigner();
      if (!this.contract) throw new Error('合约未初始化');
      
      console.log('Storing data:', { dataType, content });
      
      // 进度回调：估算Gas
      if (progressCallback) {
        progressCallback(30, '正在预估Gas费用...');
      }

      // 预估gas费用
      const gasEstimate = await this.contract.estimateGas.storeData(dataType, content);
      console.log('Gas estimate:', gasEstimate.toString());

      // 进度回调：发送交易
      if (progressCallback) {
        progressCallback(50, '正在发送交易...');
      }
      
      const tx = await this.contract.storeData(dataType, content, {
        gasLimit: gasEstimate.mul(120).div(100) // 增加20%的gas缓冲
      });
      
      console.log('Transaction submitted:', tx.hash);

      // 进度回调：等待确认
      if (progressCallback) {
        progressCallback(75, '正在等待区块确认...');
      }

      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      // 进度回调：完成
      if (progressCallback) {
        progressCallback(100, '交易确认完成！');
      }
      
      return { tx, receipt };
    } catch (error) {
      console.error('Store data failed:', error);
      // 进度回调：错误
      if (progressCallback) {
        progressCallback(-1, `操作失败: ${error.message}`);
      }
      this.handleContractError(error);
    }
  }

  async getDataRecord(recordId) {
    try {
      if (!this.contract) throw new Error('合约未初始化');
      
      const record = await this.contract.getDataRecord(recordId);
      return {
        id: record.id.toNumber(),
        dataType: record.dataType,
        content: record.content,
        creator: record.creator,
        timestamp: record.timestamp.toNumber(),
        isActive: record.isActive
      };
    } catch (error) {
      console.error('Get data record failed:', error);
      this.handleContractError(error);
    }
  }

  async getActiveRecords(offset, limit) {
    try {
      if (!this.contract) throw new Error('合约未初始化');
      
      const records = await this.contract.getActiveRecords(offset, limit);
      return records.map(record => ({
        id: record.id.toNumber(),
        dataType: record.dataType,
        content: record.content,
        creator: record.creator,
        timestamp: record.timestamp.toNumber(),
        isActive: record.isActive
      }));
    } catch (error) {
      console.error('Get active records failed:', error);
      this.handleContractError(error);
    }
  }

  async getRecordsByType(dataType) {
    try {
      if (!this.contract) throw new Error('合约未初始化');
      
      const recordIds = await this.contract.getRecordsByType(dataType);
      return recordIds.map(id => id.toNumber());
    } catch (error) {
      console.error('Get records by type failed:', error);
      this.handleContractError(error);
    }
  }

  async getRecordsByCreator(creator) {
    try {
      if (!this.contract) throw new Error('合约未初始化');
      
      const recordIds = await this.contract.getRecordsByCreator(creator);
      return recordIds.map(id => id.toNumber());
    } catch (error) {
      console.error('Get records by creator failed:', error);
      this.handleContractError(error);
    }
  }

  async getStats() {
    try {
      if (!this.contract) throw new Error('合约未初始化');
      
      const stats = await this.contract.getStats();
      return {
        total: stats.total.toNumber(),
        active: stats.active.toNumber(),
        totalTypes: stats.totalTypes.toNumber()
      };
    } catch (error) {
      console.error('Get stats failed:', error);
      this.handleContractError(error);
    }
  }

  async updateData(recordId, newContent, progressCallback = null) {
    try {
      if (progressCallback) {
        progressCallback(20, '正在获取钱包签名器...');
      }

      await this.getSigner();
      if (!this.contract) throw new Error('合约未初始化');

      if (progressCallback) {
        progressCallback(40, '正在预估Gas费用...');
      }
      
      const gasEstimate = await this.contract.estimateGas.updateData(recordId, newContent);

      if (progressCallback) {
        progressCallback(60, '正在发送更新交易...');
      }

      const tx = await this.contract.updateData(recordId, newContent, {
        gasLimit: gasEstimate.mul(120).div(100)
      });

      if (progressCallback) {
        progressCallback(80, '等待交易确认...');
      }
      
      const receipt = await tx.wait();

      if (progressCallback) {
        progressCallback(100, '更新成功！');
      }

      return { tx, receipt };
    } catch (error) {
      console.error('Update data failed:', error);
      if (progressCallback) {
        progressCallback(-1, `更新失败: ${error.message}`);
      }
      this.handleContractError(error);
    }
  }

  async deactivateData(recordId, progressCallback = null) {
    try {
      if (progressCallback) {
        progressCallback(20, '正在获取钱包签名器...');
      }

      await this.getSigner();
      if (!this.contract) throw new Error('合约未初始化');

      if (progressCallback) {
        progressCallback(40, '正在预估Gas费用...');
      }
      
      const gasEstimate = await this.contract.estimateGas.deactivateData(recordId);

      if (progressCallback) {
        progressCallback(60, '正在发送停用交易...');
      }

      const tx = await this.contract.deactivateData(recordId, {
        gasLimit: gasEstimate.mul(120).div(100)
      });

      if (progressCallback) {
        progressCallback(80, '等待交易确认...');
      }
      
      const receipt = await tx.wait();

      if (progressCallback) {
        progressCallback(100, '停用成功！');
      }

      return { tx, receipt };
    } catch (error) {
      console.error('Deactivate data failed:', error);
      if (progressCallback) {
        progressCallback(-1, `停用失败: ${error.message}`);
      }
      this.handleContractError(error);
    }
  }

  // 批量操作方法（带进度回调）
  async batchStoreData(dataList, progressCallback = null) {
    const results = [];
    const total = dataList.length;
    
    for (let i = 0; i < total; i++) {
      const { dataType, content } = dataList[i];
      
      try {
        if (progressCallback) {
          const progress = Math.floor(((i + 1) / total) * 100);
          progressCallback(progress, `正在处理第 ${i + 1}/${total} 条数据...`);
        }

        const result = await this.storeData(dataType, content);
        results.push({ success: true, result, index: i });
        
        // 添加延迟避免网络拥堵
        if (i < total - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        results.push({ success: false, error: error.message, index: i });
      }
    }
    
    return results;
  }

  // 错误处理
  handleContractError(error) {
    let message = '操作失败';
    
    if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      message = '交易可能会失败，请检查参数或网络状态';
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      message = '余额不足，无法支付gas费用';
    } else if (error.code === 'NETWORK_ERROR') {
      message = '网络连接错误，请检查网络设置';
    } else if (error.code === 'CALL_EXCEPTION') {
      if (error.reason) {
        message = `合约调用失败: ${error.reason}`;
      } else {
        message = '合约调用异常，可能是参数错误';
      }
    } else if (error.code === 'TIMEOUT') {
      message = '交易超时，请重试';
    } else if (error.code === 4001) {
      message = '用户拒绝了交易';
    } else if (error.message) {
      // 提取更友好的错误信息
      if (error.message.includes('execution reverted')) {
        const match = error.message.match(/execution reverted: (.*?)$/);
        message = match ? `执行失败: ${match[1]}` : '交易执行被拒绝';
      } else if (error.message.includes('user rejected')) {
        message = '用户取消了交易';
      } else if (error.message.includes('insufficient funds')) {
        message = '余额不足';
      } else if (error.message.includes('gas required exceeds allowance')) {
        message = 'Gas费用超出限制';
      } else {
        message = error.message;
      }
    }
    
    throw new Error(message);
  }

  // 监听事件
  onDataStored(callback) {
    if (!this.contract) return;
    
    this.contract.on('DataStored', (id, dataType, creator, timestamp, event) => {
      callback({
        id: id.toNumber(),
        dataType,
        creator,
        timestamp: timestamp.toNumber(),
        transactionHash: event.transactionHash
      });
    });
  }

  onDataUpdated(callback) {
    if (!this.contract) return;
    
    this.contract.on('DataUpdated', (id, newContent, timestamp, event) => {
      callback({
        id: id.toNumber(),
        newContent,
        timestamp: timestamp.toNumber(),
        transactionHash: event.transactionHash
      });
    });
  }

  onDataDeactivated(callback) {
    if (!this.contract) return;
    
    this.contract.on('DataDeactivated', (id, timestamp, event) => {
      callback({
        id: id.toNumber(),
        timestamp: timestamp.toNumber(),
        transactionHash: event.transactionHash
      });
    });
  }

  // 移除所有事件监听器
  removeAllListeners() {
    if (this.contract) {
      this.contract.removeAllListeners();
    }
  }

  // 获取网络信息
  async getNetworkInfo() {
    if (!this.provider) return null;
    
    try {
      const network = await this.provider.getNetwork();
      return {
        chainId: network.chainId,
        name: network.name,
        ensAddress: network.ensAddress
      };
    } catch (error) {
      console.error('Failed to get network info:', error);
      return null;
    }
  }

  // 获取账户余额
  async getBalance(address) {
    if (!this.provider || !address) return null;
    
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('Failed to get balance:', error);
      return null;
    }
  }

  // 获取交易状态（用于进度追踪）
  async getTransactionStatus(txHash) {
    if (!this.provider || !txHash) return null;
    
    try {
      const tx = await this.provider.getTransaction(txHash);
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      return {
        transaction: tx,
        receipt: receipt,
        status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending',
        confirmations: receipt ? receipt.confirmations : 0
      };
    } catch (error) {
      console.error('Failed to get transaction status:', error);
      return null;
    }
  }

  // 等待交易确认（带进度更新）
  async waitForTransaction(txHash, confirmations = 1, progressCallback = null) {
    if (!this.provider || !txHash) return null;
    
    try {
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) throw new Error('交易未找到');

      if (progressCallback) {
        progressCallback(50, '等待交易被打包...');
      }

      const receipt = await tx.wait(confirmations);

      if (progressCallback) {
        progressCallback(100, `交易确认完成 (${confirmations} 个确认)`);
      }

      return receipt;
    } catch (error) {
      if (progressCallback) {
        progressCallback(-1, `等待确认失败: ${error.message}`);
      }
      throw error;
    }
  }

  // 获取Gas价格建议
  async getGasPriceRecommendation() {
    if (!this.provider) return null;
    
    try {
      const gasPrice = await this.provider.getGasPrice();
      const gasPriceInGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
      
      return {
        current: parseFloat(gasPriceInGwei),
        fast: parseFloat(gasPriceInGwei) * 1.2,
        standard: parseFloat(gasPriceInGwei),
        safe: parseFloat(gasPriceInGwei) * 0.8
      };
    } catch (error) {
      console.error('Failed to get gas price recommendation:', error);
      return null;
    }
  }

  // 修改原有的storeData方法，改为返回更完整的信息
  async storeCustomData(dataType, content, progressCallback = null) {
    try {
      const result = await this.storeData(dataType, content, progressCallback);
      
      return {
        txHash: result.tx.hash,
        status: result.receipt.status === 1 ? 'success' : 'failed',
        gasUsed: result.receipt.gasUsed.toString(),
        blockNumber: result.receipt.blockNumber,
        dataType,
        customData: content
      };
    } catch (error) {
      throw error;
    }
  }

  // 通过事件日志查询数据记录
  async queryDataFromLogs(fromBlock = 'earliest', toBlock = 'latest', filters = {}) {
    try {
      if (!this.contract) throw new Error('合约未初始化');

      // 创建事件过滤器
      let eventFilter = this.contract.filters.DataStored();
      
      // 如果指定了创建者地址，添加到过滤器
      if (filters.creator) {
        eventFilter = this.contract.filters.DataStored(null, null, filters.creator);
      }

      // 查询事件日志
      const events = await this.contract.queryFilter(eventFilter, fromBlock, toBlock);
      
      // 处理事件数据
      const dataRecords = await Promise.all(
        events.map(async (event) => {
          const { id, dataType, creator, timestamp } = event.args;
          
          try {
            // 获取完整的数据记录
            const fullRecord = await this.getDataRecord(id.toNumber());
            
            return {
              id: id.toNumber(),
              dataType,
              customData: fullRecord.content,
              creator,
              timestamp: timestamp.toNumber(),
              date: new Date(timestamp.toNumber() * 1000).toLocaleString(),
              txHash: event.transactionHash,
              blockNumber: event.blockNumber,
              isActive: fullRecord.isActive,
              status: 'success'
            };
          } catch (error) {
            console.warn(`Failed to get full record for ID ${id.toNumber()}:`, error);
            return {
              id: id.toNumber(),
              dataType,
              customData: '无法获取数据内容',
              creator,
              timestamp: timestamp.toNumber(),
              date: new Date(timestamp.toNumber() * 1000).toLocaleString(),
              txHash: event.transactionHash,
              blockNumber: event.blockNumber,
              isActive: false,
              status: 'partial'
            };
          }
        })
      );

      // 按时间戳降序排列（最新的在前）
      return dataRecords
        .filter(record => record !== null)
        .sort((a, b) => b.timestamp - a.timestamp);

    } catch (error) {
      console.error('Query data from logs failed:', error);
      throw new Error('查询事件日志失败: ' + error.message);
    }
  }

  // 根据创建者地址查询数据记录
  async queryDataByCreator(creatorAddress, fromBlock = 'earliest', toBlock = 'latest') {
    return this.queryDataFromLogs(fromBlock, toBlock, { creator: creatorAddress });
  }

  // 查询最近的数据记录
  async queryRecentData(limit = 10) {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // 查询最近10000个区块
      
      const allRecords = await this.queryDataFromLogs(fromBlock, 'latest');
      
      // 返回限制数量的记录
      return allRecords.slice(0, limit);
    } catch (error) {
      console.error('Query recent data failed:', error);
      throw new Error('查询最近数据失败: ' + error.message);
    }
  }
}

export default DataStorageService;
