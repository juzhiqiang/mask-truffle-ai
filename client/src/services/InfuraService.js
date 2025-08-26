import { ethers } from 'ethers';

class InfuraService {
  constructor() {
    // Infura项目ID，
    this.infuraProjectId = '4522c2c01dce4532a23dd57f9c816286';
    this.providers = {};
    this.supportedNetworks = {
      1: 'mainnet',        // 以太坊主网
      5: 'goerli',         // Goerli测试网
      11155111: 'sepolia', // Sepolia测试网
      137: 'polygon',      // Polygon主网
      80001: 'mumbai'      // Mumbai测试网
    };
    this.initProviders();
  }

  initProviders() {
    Object.entries(this.supportedNetworks).forEach(([chainId, networkName]) => {
      try {
        let provider;
        if (networkName === 'polygon') {
          provider = new ethers.providers.JsonRpcProvider(
            `https://polygon-mainnet.infura.io/v3/${this.infuraProjectId}`
          );
        } else if (networkName === 'mumbai') {
          provider = new ethers.providers.JsonRpcProvider(
            `https://polygon-mumbai.infura.io/v3/${this.infuraProjectId}`
          );
        } else {
          provider = new ethers.providers.InfuraProvider(networkName, this.infuraProjectId);
        }
        
        this.providers[chainId] = provider;
      } catch (error) {
        console.warn(`Failed to initialize provider for chain ${chainId}:`, error);
      }
    });
  }

  getProvider(chainId) {
    const provider = this.providers[chainId];
    if (!provider) {
      throw new Error(`不支持的网络 Chain ID: ${chainId}`);
    }
    return provider;
  }

  async getTransaction(txHash, chainId) {
    try {
      const provider = this.getProvider(chainId);
      const transaction = await provider.getTransaction(txHash);
      
      if (!transaction) {
        throw new Error('交易未找到');
      }

      return transaction;
    } catch (error) {
      console.error('获取交易失败:', error);
      throw error;
    }
  }

  async getTransactionReceipt(txHash, chainId) {
    try {
      const provider = this.getProvider(chainId);
      const receipt = await provider.getTransactionReceipt(txHash);
      
      return receipt;
    } catch (error) {
      console.error('获取交易回执失败:', error);
      throw error;
    }
  }

  // 解析交易的Input Data中的备注信息
  parseTransactionMemo(inputData) {
    if (!inputData || inputData === '0x') {
      return null;
    }

    try {
      // 移除0x前缀
      const hexData = inputData.startsWith('0x') ? inputData.slice(2) : inputData;
      
      // 转换为UTF-8字符串
      const bytes = Buffer.from(hexData, 'hex');
      const memo = bytes.toString('utf8');
      
      // 检查是否为有效的UTF-8字符串
      if (memo && memo.length > 0) {
        return memo;
      }
      
      return null;
    } catch (error) {
      console.warn('解析Input Data失败:', error);
      return null;
    }
  }

  // 获取交易详情包括Input Data中的备注
  async getTransactionWithMemo(txHash, chainId) {
    try {
      const [transaction, receipt] = await Promise.all([
        this.getTransaction(txHash, chainId),
        this.getTransactionReceipt(txHash, chainId)
      ]);

      // 解析Input Data中的备注
      const memo = this.parseTransactionMemo(transaction.data);

      return {
        transaction,
        receipt,
        memo,
        hasInputData: transaction.data && transaction.data !== '0x',
        from: transaction.from,
        to: transaction.to,
        value: ethers.utils.formatEther(transaction.value),
        gasUsed: receipt ? receipt.gasUsed.toString() : null,
        status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending',
        blockNumber: receipt ? receipt.blockNumber : null,
        confirmations: receipt ? receipt.confirmations : 0
      };
    } catch (error) {
      console.error('获取交易详情失败:', error);
      throw error;
    }
  }

  // 批量获取地址的交易历史（仅支持主网）
  async getAddressTransactions(address, chainId = 1, startBlock = 0, endBlock = 'latest') {
    try {
      const provider = this.getProvider(chainId);
      
      // 注意：这个方法需要Etherscan API或者其他索引服务
      // Infura本身不提供地址交易历史查询
      console.warn('批量获取地址交易需要使用Etherscan API等服务');
      
      throw new Error('该功能需要集成Etherscan API');
    } catch (error) {
      console.error('获取地址交易历史失败:', error);
      throw error;
    }
  }

  // 检查网络连接状态
  async checkNetworkStatus(chainId) {
    try {
      const provider = this.getProvider(chainId);
      const blockNumber = await provider.getBlockNumber();
      const network = await provider.getNetwork();
      
      return {
        connected: true,
        chainId: network.chainId,
        networkName: network.name,
        latestBlock: blockNumber,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`网络状态检查失败 (Chain ID: ${chainId}):`, error);
      return {
        connected: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  // 获取当前用户连接的网络信息
  async getCurrentNetworkInfo() {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const chainIdDecimal = parseInt(chainId, 16);
        
        return {
          chainId: chainIdDecimal,
          networkName: this.supportedNetworks[chainIdDecimal] || 'unknown',
          supported: !!this.supportedNetworks[chainIdDecimal]
        };
      } else {
        throw new Error('未检测到以太坊钱包');
      }
    } catch (error) {
      console.error('获取当前网络信息失败:', error);
      throw error;
    }
  }

  // 验证Infura配置
  validateInfuraConfig() {
    return this.infuraProjectId && this.infuraProjectId !== 'YOUR_INFURA_PROJECT_ID';
  }
}

export default InfuraService;