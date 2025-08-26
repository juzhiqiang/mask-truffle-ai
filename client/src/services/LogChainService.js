import { ethers } from "ethers";

// 日志链上存储合约ABI
const LOG_CONTRACT_ABI = [
  {
    "inputs": [
      {"internalType": "string", "name": "_logType", "type": "string"},
      {"internalType": "string", "name": "_logData", "type": "string"},
      {"internalType": "uint256", "name": "_timestamp", "type": "uint256"}
    ],
    "name": "storeLog",
    "outputs": [
      {"internalType": "uint256", "name": "logId", "type": "uint256"}
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "_logId", "type": "uint256"}
    ],
    "name": "getLog",
    "outputs": [
      {"internalType": "address", "name": "creator", "type": "address"},
      {"internalType": "string", "name": "logType", "type": "string"},
      {"internalType": "string", "name": "logData", "type": "string"},
      {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "_creator", "type": "address"}
    ],
    "name": "getLogsByCreator",
    "outputs": [
      {"internalType": "uint256[]", "name": "", "type": "uint256[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "creator", "type": "address"},
      {"indexed": true, "internalType": "uint256", "name": "logId", "type": "uint256"},
      {"indexed": false, "internalType": "string", "name": "logType", "type": "string"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "LogStored",
    "type": "event"
  }
];

// 不同网络的合约地址
const LOG_CONTRACT_ADDRESSES = {
  // 以太坊主网
  'ethereum': '0x0000000000000000000000000000000000000000', // 待部署
  // 以太坊测试网
  'goerli': '0x0000000000000000000000000000000000000000', // 待部署
  'sepolia': '0x0000000000000000000000000000000000000000', // 待部署
  // 本地开发网络
  'hardhat': '0x0000000000000000000000000000000000000000', // 待部署
  'ganache': '0x0000000000000000000000000000000000000000', // 待部署
};

class LogChainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.isInitialized = false;
    this.init();
  }

  async init() {
    try {
      if (typeof window !== "undefined" && window.ethereum) {
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        this.isInitialized = true;
        console.log("LogChain service initialized successfully");
      } else {
        console.warn("No Ethereum provider found");
        throw new Error("未检测到以太坊钱包");
      }
    } catch (error) {
      console.error("Failed to initialize LogChain service:", error);
      throw error;
    }
  }

  // 检查是否为有效的回调函数
  isValidCallback(callback) {
    return callback && typeof callback === 'function';
  }

  // 检查网络是否支持EIP-1559
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

  // 获取当前网络信息
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

  // 获取日志合约实例
  async getLogContract() {
    try {
      const network = await this.getCurrentNetwork();
      if (!network) {
        throw new Error('无法获取网络信息');
      }

      const contractAddress = LOG_CONTRACT_ADDRESSES[network.name];
      if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error(`当前网络 ${network.displayName} 暂不支持日志合约功能`);
      }

      if (!this.contract || this.contract.address !== contractAddress) {
        this.contract = new ethers.Contract(contractAddress, LOG_CONTRACT_ABI, this.signer || this.provider);
      }

      return this.contract;
    } catch (error) {
      console.error('获取日志合约失败:', error);
      throw error;
    }
  }

  // 上传日志数据到区块链合约
  async uploadLogToChain(logData, logType = 'info', progressCallback = null) {
    try {
      await this.checkConnection();
      
      if (this.isValidCallback(progressCallback)) {
        progressCallback(10, '准备连接日志合约...');
      }

      // 获取合约实例
      const contract = await this.getLogContract();
      const contractWithSigner = contract.connect(this.signer);

      if (this.isValidCallback(progressCallback)) {
        progressCallback(30, '构建日志交易...');
      }

      // 创建时间戳
      const timestamp = Math.floor(Date.now() / 1000);

      // 估算Gas费用
      let gasEstimate;
      try {
        gasEstimate = await contractWithSigner.estimateGas.storeLog(logType, logData, timestamp);
        gasEstimate = gasEstimate.mul(120).div(100); // 增加20%的Gas余量
      } catch (gasError) {
        console.warn('Gas估算失败，使用默认值:', gasError);
        gasEstimate = ethers.BigNumber.from('200000'); // 默认20万Gas
      }

      if (this.isValidCallback(progressCallback)) {
        progressCallback(50, '发送日志上链交易...');
      }

      // 构建交易选项
      const txOptions = { gasLimit: gasEstimate };
      
      // 检查是否支持EIP-1559
      const supportsEIP1559 = await this.supportsEIP1559();
      if (supportsEIP1559) {
        const feeData = await this.provider.getFeeData();
        txOptions.maxFeePerGas = feeData.maxFeePerGas;
        txOptions.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
      } else {
        const gasPrice = await this.provider.getGasPrice();
        txOptions.gasPrice = gasPrice;
      }

      // 调用合约存储日志
      const tx = await contractWithSigner.storeLog(logType, logData, timestamp, txOptions);
      
      if (this.isValidCallback(progressCallback)) {
        progressCallback(80, '等待交易确认...');
      }

      // 等待交易确认
      const receipt = await tx.wait();

      if (this.isValidCallback(progressCallback)) {
        progressCallback(90, '解析交易结果...');
      }

      // 解析事件获取日志ID
      let logId = null;
      if (receipt.events && receipt.events.length > 0) {
        const logEvent = receipt.events.find(event => event.event === 'LogStored');
        if (logEvent && logEvent.args) {
          logId = logEvent.args.logId?.toString();
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
        logType: logType,
        logData: logData,
        contractAddress: contract.address,
        inputData: tx.data || '0x'
      };

    } catch (error) {
      console.error('日志上链失败:', error);
      if (this.isValidCallback(progressCallback)) {
        progressCallback(-1, `日志上链失败: ${error.message}`);
      }
      
      // 提供更友好的错误信息
      let friendlyMessage = error.message;
      if (error.message.includes('当前网络') && error.message.includes('暂不支持')) {
        friendlyMessage = '当前网络暂不支持日志合约功能，请切换到支持的网络';
      } else if (error.message.includes('user rejected')) {
        friendlyMessage = '用户取消了交易';
      } else if (error.message.includes('insufficient funds')) {
        friendlyMessage = 'Gas费用不足，请确保钱包有足够的余额';
      }
      
      throw new Error(friendlyMessage);
    }
  }

  // 从合约读取日志数据
  async getLogFromChain(logId) {
    try {
      const contract = await this.getLogContract();
      const logData = await contract.getLog(logId);
      
      return {
        creator: logData[0],
        logType: logData[1],
        logData: logData[2],
        timestamp: logData[3].toNumber()
      };
    } catch (error) {
      console.error('读取链上日志失败:', error);
      throw new Error(`读取日志失败: ${error.message}`);
    }
  }

  // 获取用户的所有日志ID
  async getUserLogs(userAddress) {
    try {
      const contract = await this.getLogContract();
      const logIds = await contract.getLogsByCreator(userAddress);
      
      return logIds.map(id => id.toString());
    } catch (error) {
      console.error('获取用户日志列表失败:', error);
      throw new Error(`获取日志列表失败: ${error.message}`);
    }
  }

  // 检查当前网络是否支持日志合约
  async isNetworkSupported() {
    try {
      const network = await this.getCurrentNetwork();
      if (!network) return false;
      
      const contractAddress = LOG_CONTRACT_ADDRESSES[network.name];
      return contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000';
    } catch (error) {
      console.error('检查网络支持失败:', error);
      return false;
    }
  }

  // 获取支持的网络列表
  getSupportedNetworks() {
    return Object.keys(LOG_CONTRACT_ADDRESSES)
      .filter(network => LOG_CONTRACT_ADDRESSES[network] !== '0x0000000000000000000000000000000000000000')
      .map(network => ({
        name: network,
        contractAddress: LOG_CONTRACT_ADDRESSES[network]
      }));
  }
}

export default LogChainService;