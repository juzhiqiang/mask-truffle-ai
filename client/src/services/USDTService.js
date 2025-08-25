import { ethers } from 'ethers';

// USDT合约ABI (ERC-20标准)
const USDT_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

// 主网USDT合约地址
const USDT_ADDRESSES = {
  ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum主网
  bsc: '0x55d398326f99059fF775485246999027B3197955', // BSC
  polygon: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // Polygon
};

// 网络ID映射
const CHAIN_ID_TO_NETWORK = {
  1: 'ethereum',   // Ethereum 主网
  56: 'bsc',       // BSC 主网
  137: 'polygon'   // Polygon 主网
};

class USDTService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contracts = new Map();
    this.init();
  }

  async init() {
    if (typeof window !== 'undefined' && window.ethereum) {
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      console.log('USDT service initialized successfully');
    } else {
      throw new Error('未检测到以太坊钱包');
    }
  }

  async getSigner() {
    if (!this.signer && this.provider) {
      this.signer = this.provider.getSigner();
    }
    return this.signer;
  }

  getUSDTContract(network = 'ethereum') {
    const contractAddress = USDT_ADDRESSES[network.toLowerCase()];
    if (!contractAddress) {
      throw new Error(`不支持的网络: ${network}`);
    }

    if (!this.contracts.has(network)) {
      const contract = new ethers.Contract(contractAddress, USDT_ABI, this.provider);
      this.contracts.set(network, contract);
    }

    return this.contracts.get(network);
  }

  async getUSDTBalance(userAddress, network = null) {
    try {
      // 如果没有指定网络，自动检测当前网络
      if (!network) {
        network = await this.isCurrentNetworkSupported();
        if (!network) {
          console.warn('当前网络不支持USDT');
          return '0';
        }
      }

      console.log(`正在获取 ${network} 网络上的USDT余额...`);
      
      const contract = this.getUSDTContract(network);
      
      // 添加超时处理
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('获取余额超时')), 10000);
      });

      const balancePromise = contract.balanceOf(userAddress);
      const balance = await Promise.race([balancePromise, timeoutPromise]);
      
      // 获取小数位数，默认为6位（USDT标准）
      let decimals = 6;
      try {
        decimals = await contract.decimals();
      } catch (error) {
        console.warn('无法获取小数位数，使用默认值6:', error);
      }

      const formattedBalance = ethers.utils.formatUnits(balance, decimals);
      console.log(`USDT余额获取成功: ${formattedBalance} USDT`);
      
      return formattedBalance;
    } catch (error) {
      console.error('获取USDT余额失败:', error);
      
      // 根据错误类型提供更详细的信息
      if (error.code === 'CALL_EXCEPTION') {
        console.error('智能合约调用异常，可能的原因：');
        console.error('1. 网络不匹配或不支持');
        console.error('2. RPC节点问题');
        console.error('3. 合约地址错误');
        throw new Error('无法连接到USDT合约，请检查网络设置');
      } else if (error.message.includes('超时')) {
        throw new Error('网络请求超时，请稍后重试');
      } else {
        throw error;
      }
    }
  }

  async transferUSDT(toAddress, amount, network = 'ethereum', progressCallback = null) {
    try {
      if (progressCallback) {
        progressCallback(10, '正在获取钱包签名器...');
      }

      const signer = await this.getSigner();
      const contract = this.getUSDTContract(network).connect(signer);
      
      if (progressCallback) {
        progressCallback(20, '正在检查USDT余额...');
      }

      // 检查余额
      const userAddress = await signer.getAddress();
      const balance = await this.getUSDTBalance(userAddress, network);
      
      if (parseFloat(balance) < parseFloat(amount)) {
        throw new Error(`USDT余额不足。当前余额: ${balance} USDT`);
      }

      if (progressCallback) {
        progressCallback(35, '正在准备转账参数...');
      }

      // 获取小数位数
      let decimals = 6;
      try {
        decimals = await contract.decimals();
      } catch (error) {
        console.warn('无法获取小数位数，使用默认值6');
      }

      // 转换金额为合约格式
      const amountInWei = ethers.utils.parseUnits(amount.toString(), decimals);

      if (progressCallback) {
        progressCallback(50, '正在估算Gas费用...');
      }

      // 估算gas费用
      const gasEstimate = await contract.estimateGas.transfer(toAddress, amountInWei);

      if (progressCallback) {
        progressCallback(65, '正在发送USDT转账交易...');
      }

      // 发送转账交易
      const tx = await contract.transfer(toAddress, amountInWei, {
        gasLimit: gasEstimate.mul(120).div(100) // 增加20%gas缓冲
      });

      if (progressCallback) {
        progressCallback(80, '等待交易确认...');
      }

      // 等待交易确认
      const receipt = await tx.wait();

      if (progressCallback) {
        progressCallback(100, 'USDT转账成功！');
      }

      return {
        tx,
        receipt,
        amount,
        toAddress,
        network,
        txHash: tx.hash
      };

    } catch (error) {
      console.error('USDT转账失败:', error);
      if (progressCallback) {
        progressCallback(-1, `USDT转账失败: ${error.message}`);
      }
      throw error;
    }
  }

  async getCurrentNetwork() {
    try {
      const network = await this.provider.getNetwork();
      return {
        chainId: network.chainId,
        name: network.name
      };
    } catch (error) {
      console.error('获取网络信息失败:', error);
      return null;
    }
  }

  // 获取支持的网络列表
  getSupportedNetworks() {
    return Object.keys(USDT_ADDRESSES).map(key => ({
      key,
      name: this.getNetworkDisplayName(key),
      contractAddress: USDT_ADDRESSES[key]
    }));
  }

  getNetworkDisplayName(network) {
    const names = {
      ethereum: 'Ethereum 主网',
      bsc: 'Binance Smart Chain',
      polygon: 'Polygon'
    };
    return names[network] || network;
  }

  // 检查当前网络是否支持USDT - 增强版
  async isCurrentNetworkSupported() {
    try {
      const network = await this.getCurrentNetwork();
      if (!network) {
        console.warn('无法获取当前网络信息');
        return null;
      }

      const supportedNetwork = CHAIN_ID_TO_NETWORK[network.chainId];
      
      if (supportedNetwork) {
        console.log(`检测到支持的网络: ${this.getNetworkDisplayName(supportedNetwork)} (${network.chainId})`);
        return supportedNetwork;
      } else {
        console.warn(`不支持的网络: ${network.name} (${network.chainId})`);
        console.log('支持的网络:', Object.keys(USDT_ADDRESSES));
        return null;
      }
    } catch (error) {
      console.error('检查网络支持失败:', error);
      return null;
    }
  }

  // 格式化USDT金额显示
  formatUSDTAmount(amount, decimals = 2) {
    const num = parseFloat(amount);
    return num.toFixed(decimals);
  }

  // 验证地址格式
  isValidAddress(address) {
    try {
      return ethers.utils.isAddress(address);
    } catch (error) {
      return false;
    }
  }

  // 获取网络状态信息 - 用于调试
  async getNetworkStatus() {
    try {
      const network = await this.getCurrentNetwork();
      const supportedNetwork = await this.isCurrentNetworkSupported();
      
      return {
        current: network,
        supported: supportedNetwork,
        availableNetworks: this.getSupportedNetworks(),
        isSupported: !!supportedNetwork
      };
    } catch (error) {
      console.error('获取网络状态失败:', error);
      return null;
    }
  }
}

export default USDTService;