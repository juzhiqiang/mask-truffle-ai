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
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '0x...';

class DataStorageService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.signer = null;
    this.init();
  }

  async init() {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.provider);
    }
  }

  async getSigner() {
    if (!this.signer && this.provider) {
      this.signer = this.provider.getSigner();
      this.contract = this.contract.connect(this.signer);
    }
    return this.signer;
  }

  async storeData(dataType, content) {
    await this.getSigner();
    if (!this.contract) throw new Error('Contract not initialized');
    
    const tx = await this.contract.storeData(dataType, content);
    await tx.wait();
    return tx;
  }

  async getDataRecord(recordId) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const record = await this.contract.getDataRecord(recordId);
    return {
      id: record.id.toNumber(),
      dataType: record.dataType,
      content: record.content,
      creator: record.creator,
      timestamp: record.timestamp.toNumber(),
      isActive: record.isActive
    };
  }

  async getActiveRecords(offset, limit) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const records = await this.contract.getActiveRecords(offset, limit);
    return records.map(record => ({
      id: record.id.toNumber(),
      dataType: record.dataType,
      content: record.content,
      creator: record.creator,
      timestamp: record.timestamp.toNumber(),
      isActive: record.isActive
    }));
  }

  async getRecordsByType(dataType) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const recordIds = await this.contract.getRecordsByType(dataType);
    return recordIds.map(id => id.toNumber());
  }

  async getRecordsByCreator(creator) {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const recordIds = await this.contract.getRecordsByCreator(creator);
    return recordIds.map(id => id.toNumber());
  }

  async getStats() {
    if (!this.contract) throw new Error('Contract not initialized');
    
    const stats = await this.contract.getStats();
    return {
      total: stats.total.toNumber(),
      active: stats.active.toNumber(),
      totalTypes: stats.totalTypes.toNumber()
    };
  }

  async updateData(recordId, newContent) {
    await this.getSigner();
    if (!this.contract) throw new Error('Contract not initialized');
    
    const tx = await this.contract.updateData(recordId, newContent);
    await tx.wait();
    return tx;
  }

  async deactivateData(recordId) {
    await this.getSigner();
    if (!this.contract) throw new Error('Contract not initialized');
    
    const tx = await this.contract.deactivateData(recordId);
    await tx.wait();
    return tx;
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
}

export default DataStorageService;
