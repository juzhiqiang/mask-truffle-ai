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

  async storeData(dataType, content) {
    try {
      await this.getSigner();
      if (!this.contract) throw new Error('合约未初始化');
      
      console.log('Storing data:', { dataType, content });
      
      // 预估gas费用
      const gasEstimate = await this.contract.estimateGas.storeData(dataType, content);
      console.log('Gas estimate:', gasEstimate.toString());
      
      const tx = await this.contract.storeData(dataType, content, {
        gasLimit: gasEstimate.mul(120).div(100) // 增加20%的gas缓冲
      });
      
      console.log('Transaction submitted:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);
      
      return { tx, receipt };
    } catch (error) {
      console.error('Store data failed:', error);
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

  async updateData(recordId, newContent) {
    try {
      await this.getSigner();
      if (!this.contract) throw new Error('合约未初始化');
      
      const gasEstimate = await this.contract.estimateGas.updateData(recordId, newContent);
      const tx = await this.contract.updateData(recordId, newContent, {
        gasLimit: gasEstimate.mul(120).div(100)
      });
      
      const receipt = await tx.wait();
      return { tx, receipt };
    } catch (error) {
      console.error('Update data failed:', error);
      this.handleContractError(error);
    }
  }

  async deactivateData(recordId) {
    try {
      await this.getSigner();
      if (!this.contract) throw new Error('合约未初始化');
      
      const gasEstimate = await this.contract.estimateGas.deactivateData(recordId);
      const tx = await this.contract.deactivateData(recordId, {
        gasLimit: gasEstimate.mul(120).div(100)
      });
      
      const receipt = await tx.wait();
      return { tx, receipt };
    } catch (error) {
      console.error('Deactivate data failed:', error);
      this.handleContractError(error);
    }
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
}

export default DataStorageService;
