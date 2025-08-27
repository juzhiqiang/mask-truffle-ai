import { ethers } from "ethers";

// DataLogContract合约ABI
const DATA_LOG_CONTRACT_ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256[]",
        name: "logIds",
        type: "uint256[]",
      },
      {
        indexed: true,
        internalType: "address",
        name: "creator",
        type: "address",
      },
      {
        indexed: true,
        internalType: "string",
        name: "dataType",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
    ],
    name: "BatchDataStored",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "logId",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "creator",
        type: "address",
      },
      {
        indexed: true,
        internalType: "string",
        name: "dataType",
        type: "string",
      },
      {
        indexed: false,
        internalType: "string",
        name: "content",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "dataHash",
        type: "bytes32",
      },
    ],
    name: "DataStored",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "previousOwner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "logs",
    outputs: [
      {
        internalType: "uint256",
        name: "logId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "creator",
        type: "address",
      },
      {
        internalType: "string",
        name: "dataType",
        type: "string",
      },
      {
        internalType: "string",
        name: "content",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "timestamp",
        type: "uint256",
      },
      {
        internalType: "bytes32",
        name: "dataHash",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [],
    name: "nextLogId",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [],
    name: "owner",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [],
    name: "renounceOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newOwner",
        type: "address",
      },
    ],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "typeToLogs",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "userLogs",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "dataType",
        type: "string",
      },
      {
        internalType: "string",
        name: "content",
        type: "string",
      },
    ],
    name: "storeData",
    outputs: [
      {
        internalType: "uint256",
        name: "logId",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "dataType",
        type: "string",
      },
      {
        internalType: "string[]",
        name: "contents",
        type: "string[]",
      },
    ],
    name: "storeBatchData",
    outputs: [
      {
        internalType: "uint256[]",
        name: "logIds",
        type: "uint256[]",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "jsonData",
        type: "string",
      },
    ],
    name: "storeJSON",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "transactionData",
        type: "string",
      },
    ],
    name: "storeTransactionData",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "logData",
        type: "string",
      },
    ],
    name: "storeLogData",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "logId",
        type: "uint256",
      },
    ],
    name: "getLogData",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "logId",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "creator",
            type: "address",
          },
          {
            internalType: "string",
            name: "dataType",
            type: "string",
          },
          {
            internalType: "string",
            name: "content",
            type: "string",
          },
          {
            internalType: "uint256",
            name: "timestamp",
            type: "uint256",
          },
          {
            internalType: "bytes32",
            name: "dataHash",
            type: "bytes32",
          },
        ],
        internalType: "struct DataLogContract.DataLog",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "getUserLogIds",
    outputs: [
      {
        internalType: "uint256[]",
        name: "",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "dataType",
        type: "string",
      },
    ],
    name: "getLogIdsByType",
    outputs: [
      {
        internalType: "uint256[]",
        name: "",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "logId",
        type: "uint256",
      },
      {
        internalType: "bytes32",
        name: "expectedHash",
        type: "bytes32",
      },
    ],
    name: "verifyDataIntegrity",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [],
    name: "getStats",
    outputs: [
      {
        internalType: "uint256",
        name: "totalLogs",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "totalUsers",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "contractAddress",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "offset",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "limit",
        type: "uint256",
      },
    ],
    name: "getLogsPaginated",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "logId",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "creator",
            type: "address",
          },
          {
            internalType: "string",
            name: "dataType",
            type: "string",
          },
          {
            internalType: "string",
            name: "content",
            type: "string",
          },
          {
            internalType: "uint256",
            name: "timestamp",
            type: "uint256",
          },
          {
            internalType: "bytes32",
            name: "dataHash",
            type: "bytes32",
          },
        ],
        internalType: "struct DataLogContract.DataLog[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
    constant: true,
  },
];

// 不同网络的DataLogContract合约地址
const DATA_LOG_CONTRACT_ADDRESSES = {
  // 以太坊主网
  ethereum: "0x0000000000000000000000000000000000000000", // 待部署
  // 以太坊测试网
  sepolia: "0x3ae524c8ec173e7081007e1c87193cdf53b78042",
  // 本地开发网络 - 为测试启用
  hardhat: "0x0768fCaf56dD570F76444Cd339a985368eb48274",
  ganache: "0x0768fCaf56dD570F76444Cd339a985368eb48274",
  // 添加更多本地测试支持
  localhost: "0x0768fCaf56dD570F76444Cd339a985368eb48274", // 本地测试
  development: "0x0768fCaf56dD570F76444Cd339a985368eb48274", // 开发环境
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
        this.provider = new ethers.providers.Web3Provider(window.ethereum, "any");
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
    return callback && typeof callback === "function";
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
        method: "eth_accounts",
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
        1: "ethereum",
        5: "goerli",
        11155111: "sepolia",
        31337: "hardhat",
        1337: "ganache", // Ganache CLI 常用网络ID
        5777: "ganache", // Ganache GUI 常用网络ID
        // 添加更多本地开发网络支持
        1338: "localhost",
        999: "development",
        // Polygon 网络
        137: "polygon",
        80001: "mumbai",
        // BSC 网络
        56: "bsc",
        97: "bsc-testnet",
      };

      let networkName = networkNames[network.chainId];

      // 如果没有匹配到具体网络，但是是本地网络范围，默认为ganache
      if (!networkName && network.chainId >= 1337 && network.chainId <= 1400) {
        networkName = "ganache";
        console.log(
          `检测到本地网络 (Chain ID: ${network.chainId})，映射为 ganache`
        );
      } else if (!networkName) {
        networkName = "unknown";
      }

      return {
        chainId: network.chainId,
        name: networkName,
        displayName: network.name || `Chain ${network.chainId}`,
      };
    } catch (error) {
      console.error("获取网络信息失败:", error);
      return null;
    }
  }

  // 获取数据日志合约实例
  async getDataLogContract() {
    try {
      const network = await this.getCurrentNetwork();
      if (!network) {
        throw new Error("无法获取网络信息");
      }

      console.log("当前网络信息:", {
        chainId: network.chainId,
        name: network.name,
        displayName: network.displayName,
      });

      const contractAddress = DATA_LOG_CONTRACT_ADDRESSES[network.name];

      console.log("查找合约地址:", {
        networkName: network.name,
        contractAddress: contractAddress,
        availableNetworks: Object.keys(DATA_LOG_CONTRACT_ADDRESSES),
      });

      if (
        !contractAddress ||
        contractAddress === "0x0000000000000000000000000000000000000000"
      ) {
        throw new Error(
          `当前网络 ${network.displayName} (Chain ID: ${
            network.chainId
          }) 暂不支持数据日志合约功能。支持的网络: ${Object.keys(
            DATA_LOG_CONTRACT_ADDRESSES
          ).join(", ")}`
        );
      }

      if (!this.contract || this.contract.address !== contractAddress) {
        // 为本地网络创建一个不使用ENS的provider
        const provider = this.signer ? this.signer.provider : this.provider;
        this.contract = new ethers.Contract(
          contractAddress,
          DATA_LOG_CONTRACT_ABI,
          this.signer || provider
        );
      }

      return this.contract;
    } catch (error) {
      console.error("获取数据日志合约失败:", error);
      throw error;
    }
  }

  // 上传日志数据到区块链合约
  async uploadLogToChain(logData, logType = "log", progressCallback = null) {
    try {
      await this.checkConnection();

      if (this.isValidCallback(progressCallback)) {
        progressCallback(10, "准备连接数据日志合约...");
      }

      // 获取合约实例
      const contract = await this.getDataLogContract();
      const contractWithSigner = contract.connect(this.signer);

      if (this.isValidCallback(progressCallback)) {
        progressCallback(30, "构建数据上链交易...");
      }

      // 根据不同的数据类型选择不同的方法
      let tx, gasEstimate;

      try {
        console.log("logType:", logType);
        // 根据logType选择合适的合约方法
        if (logType === "json") {
          gasEstimate = await contractWithSigner.estimateGas.storeJSON(logData);
        } else if (logType === "transaction") {
          gasEstimate =
            await contractWithSigner.estimateGas.storeTransactionData(logData);
        } else {
          gasEstimate = await contractWithSigner.estimateGas.storeData(
            logType,
            logData
          );
        }
        gasEstimate = gasEstimate.mul(120).div(100); // 增加20%的Gas余量
      } catch (gasError) {
        console.warn("Gas估算失败，使用默认值:", gasError);
        gasEstimate = ethers.BigNumber.from("300000"); // 默认30万Gas
      }

      if (this.isValidCallback(progressCallback)) {
        progressCallback(50, "发送数据上链交易...");
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

      // 调用对应的合约方法
      if (logType === "json") {
        tx = await contractWithSigner.storeJSON(logData, txOptions);
      } else if (logType === "transaction") {
        tx = await contractWithSigner.storeTransactionData(logData, txOptions);
      } else {
        tx = await contractWithSigner.storeData(logType, logData, txOptions);
      }

      if (this.isValidCallback(progressCallback)) {
        progressCallback(80, "等待交易确认...");
      }

      // 等待交易确认
      const receipt = await tx.wait();

      if (this.isValidCallback(progressCallback)) {
        progressCallback(90, "解析交易结果...");
      }

      // 解析事件获取日志ID
      let logId = null;
      if (receipt.events && receipt.events.length > 0) {
        const dataStoredEvent = receipt.events.find(
          (event) => event.event === "DataStored"
        );
        if (dataStoredEvent && dataStoredEvent.args) {
          logId = dataStoredEvent.args.logId?.toString();
        }
      }

      if (this.isValidCallback(progressCallback)) {
        progressCallback(100, "数据上链成功！");
      }

      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        status: receipt.status === 1 ? "success" : "failed",
        logId: logId,
        logType: logType,
        logData: logData,
        contractAddress: contract.address,
        inputData: tx.data || "0x",
      };
    } catch (error) {
      console.error("数据上链失败:", error);
      if (this.isValidCallback(progressCallback)) {
        progressCallback(-1, `数据上链失败: ${error.message}`);
      }

      // 提供更友好的错误信息
      let friendlyMessage = error.message;
      if (
        error.message.includes("当前网络") &&
        error.message.includes("暂不支持")
      ) {
        friendlyMessage =
          "当前网络暂不支持数据日志合约功能，请切换到支持的网络";
      } else if (error.message.includes("user rejected")) {
        friendlyMessage = "用户取消了交易";
      } else if (error.message.includes("insufficient funds")) {
        friendlyMessage = "Gas费用不足，请确保钱包有足够的余额";
      }

      throw new Error(friendlyMessage);
    }
  }

  // 从合约读取日志数据
  async getLogFromChain(logId) {
    try {
      const contract = await this.getDataLogContract();
      const logData = await contract.getLogData(logId);

      return {
        logId: logData.logId.toString(),
        creator: logData.creator,
        dataType: logData.dataType,
        content: logData.content,
        timestamp: logData.timestamp.toNumber(),
        dataHash: logData.dataHash,
      };
    } catch (error) {
      console.error("读取链上数据失败:", error);
      throw new Error(`读取数据失败: ${error.message}`);
    }
  }

  // 获取用户的所有日志ID
  async getUserLogs(userAddress) {
    try {
      const contract = await this.getDataLogContract();
      const logIds = await contract.getUserLogIds(userAddress);

      return logIds.map((id) => id.toString());
    } catch (error) {
      console.error("获取用户数据列表失败:", error);
      throw new Error(`获取数据列表失败: ${error.message}`);
    }
  }

  // 获取指定类型的所有日志ID
  async getLogsByType(dataType) {
    try {
      const contract = await this.getDataLogContract();
      const logIds = await contract.getLogIdsByType(dataType);

      return logIds.map((id) => id.toString());
    } catch (error) {
      console.error("获取指定类型数据失败:", error);
      throw new Error(`获取数据失败: ${error.message}`);
    }
  }

  // 分页获取链上数据
  async getPaginatedLogs(offset = 0, limit = 10) {
    try {
      const contract = await this.getDataLogContract();
      const logs = await contract.getLogsPaginated(offset, limit);

      return logs.map((log) => ({
        logId: log.logId.toString(),
        creator: log.creator,
        dataType: log.dataType,
        content: log.content,
        timestamp: log.timestamp.toNumber(),
        dataHash: log.dataHash,
        date: new Date(log.timestamp.toNumber() * 1000).toLocaleString(),
      }));
    } catch (error) {
      console.error("分页获取数据失败:", error);
      throw new Error(`获取数据失败: ${error.message}`);
    }
  }

  // 批量上传数据
  async uploadBatchData(dataType, contents, progressCallback = null) {
    try {
      await this.checkConnection();

      if (this.isValidCallback(progressCallback)) {
        progressCallback(10, "准备批量上传数据...");
      }

      const contract = await this.getDataLogContract();
      const contractWithSigner = contract.connect(this.signer);

      // 估算Gas费用
      let gasEstimate;
      try {
        gasEstimate = await contractWithSigner.estimateGas.storeBatchData(
          dataType,
          contents
        );
        gasEstimate = gasEstimate.mul(120).div(100);
      } catch (gasError) {
        console.warn("Gas估算失败，使用默认值:", gasError);
        gasEstimate = ethers.BigNumber.from("500000");
      }

      if (this.isValidCallback(progressCallback)) {
        progressCallback(50, "发送批量上传交易...");
      }

      // 构建交易选项
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

      const tx = await contractWithSigner.storeBatchData(
        dataType,
        contents,
        txOptions
      );

      if (this.isValidCallback(progressCallback)) {
        progressCallback(80, "等待交易确认...");
      }

      const receipt = await tx.wait();

      if (this.isValidCallback(progressCallback)) {
        progressCallback(100, "批量上传成功！");
      }

      return {
        txHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        status: receipt.status === 1 ? "success" : "failed",
        contractAddress: contract.address,
      };
    } catch (error) {
      console.error("批量上传失败:", error);
      if (this.isValidCallback(progressCallback)) {
        progressCallback(-1, `批量上传失败: ${error.message}`);
      }
      throw new Error(error.message);
    }
  }

  // 检查当前网络是否支持数据日志合约
  async isNetworkSupported() {
    try {
      const network = await this.getCurrentNetwork();
      if (!network) return false;

      const contractAddress = DATA_LOG_CONTRACT_ADDRESSES[network.name];
      return (
        contractAddress &&
        contractAddress !== "0x0000000000000000000000000000000000000000"
      );
    } catch (error) {
      console.error("检查网络支持失败:", error);
      return false;
    }
  }

  // 获取支持的网络列表
  getSupportedNetworks() {
    return Object.keys(DATA_LOG_CONTRACT_ADDRESSES)
      .filter(
        (network) =>
          DATA_LOG_CONTRACT_ADDRESSES[network] !==
          "0x0000000000000000000000000000000000000000"
      )
      .map((network) => ({
        name: network,
        contractAddress: DATA_LOG_CONTRACT_ADDRESSES[network],
      }));
  }

  // 获取合约统计信息
  async getContractStats() {
    try {
      const contract = await this.getDataLogContract();
      const stats = await contract.getStats();

      return {
        totalLogs: stats.totalLogs.toString(),
        totalUsers: stats.totalUsers.toString(),
        contractAddress: stats.contractAddress,
      };
    } catch (error) {
      console.error("获取合约统计信息失败:", error);
      throw new Error(`获取统计信息失败: ${error.message}`);
    }
  }
}

export default LogChainService;
