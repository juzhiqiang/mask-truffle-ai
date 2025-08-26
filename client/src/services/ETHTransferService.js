import { ethers } from "ethers";

class ETHTransferService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.isInitialized = false;
    this.init();
  }

  async init() {
    try {
      if (typeof window !== "undefined" && window.ethereum) {
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        this.isInitialized = true;
        console.log("ETH Transfer service initialized successfully");
      } else {
        console.warn("No Ethereum provider found");
        throw new Error("未检测到以太坊钱包");
      }
    } catch (error) {
      console.error("Failed to initialize ETH Transfer service:", error);
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
      // 主网、测试网和大多数L2都支持EIP-1559
      const supportedChains = [1, 5, 11155111, 137, 10, 42161]; // mainnet, goerli, sepolia, polygon, optimism, arbitrum
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
      return true;
    } catch (error) {
      throw new Error("钱包连接检查失败：" + error.message);
    }
  }

  async getSigner() {
    await this.checkConnection();

    if (!this.signer && this.provider) {
      try {
        this.signer = this.provider.getSigner();

        // 验证signer是否可用
        const address = await this.signer.getAddress();
        console.log("ETH Signer connected:", address);
      } catch (error) {
        console.error("Failed to get signer:", error);
        throw new Error("获取钱包签名器失败：" + error.message);
      }
    }
    return this.signer;
  }

  async getBalance(address) {
    try {
      if (!this.provider) {
        throw new Error("Provider未初始化");
      }

      const balance = await this.provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error("获取ETH余额失败:", error);
      throw new Error("获取余额失败: " + error.message);
    }
  }

  // 编码备注信息为input data
  encodeMemoToInputData(memo) {
    if (!memo || memo.trim() === "") {
      return "0x"; // 空数据
    }
    
    try {
      // 将UTF-8字符串转换为十六进制
      return ethers.utils.hexlify(ethers.utils.toUtf8Bytes(memo.trim()));
    } catch (error) {
      console.warn("编码备注信息失败:", error);
      return "0x";
    }
  }

  // 从input data解码备注信息
  decodeMemoFromInputData(inputData) {
    if (!inputData || inputData === "0x" || inputData === "0x0") {
      return "";
    }
    
    try {
      // 将十六进制转换为UTF-8字符串
      return ethers.utils.toUtf8String(inputData);
    } catch (error) {
      console.warn("解码备注信息失败:", error);
      return "";
    }
  }

  async transferETH(toAddress, amount, memo = "", progressCallback = null) {
    try {
      // 进度回调：准备阶段
      if (this.isValidCallback(progressCallback)) {
        progressCallback(10, "正在获取钱包签名器...");
      }

      const signer = await this.getSigner();
      const fromAddress = await signer.getAddress();

      // 进度回调：检查余额
      if (this.isValidCallback(progressCallback)) {
        progressCallback(25, "正在检查ETH余额...");
      }

      // 检查余额
      const balance = await this.getBalance(fromAddress);
      const balanceInETH = parseFloat(balance);
      const amountInETH = parseFloat(amount);

      if (balanceInETH < amountInETH) {
        throw new Error(
          `ETH余额不足。当前余额: ${balance} ETH, 需要: ${amount} ETH`
        );
      }

      // 进度回调：准备交易
      if (this.isValidCallback(progressCallback)) {
        progressCallback(40, "正在准备转账交易...");
      }

      // 转换金额为Wei
      const amountInWei = ethers.utils.parseEther(amount.toString());

      // 编码备注信息
      const inputData = this.encodeMemoToInputData(memo);

      // 检查网络是否支持EIP-1559
      const useEIP1559 = await this.supportsEIP1559();

      let txRequest;
      let gasCost;

      if (useEIP1559) {
        // EIP-1559 交易 (type 2)
        const feeData = await this.provider.getFeeData();
        
        txRequest = {
          to: toAddress,
          value: amountInWei,
          data: inputData, // 包含备注信息的input data
          type: 2,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        };

        // 进度回调：估算Gas
        if (this.isValidCallback(progressCallback)) {
          progressCallback(55, "正在估算Gas费用 (EIP-1559)...");
        }

        const gasEstimate = await signer.estimateGas(txRequest);
        gasCost = gasEstimate.mul(feeData.maxFeePerGas);
        
        // 设置gas限制 (增加10%缓冲)
        txRequest.gasLimit = gasEstimate.mul(110).div(100);

        console.log("Preparing EIP-1559 transaction with memo:", {
          maxFeePerGas: ethers.utils.formatUnits(feeData.maxFeePerGas, "gwei") + " Gwei",
          maxPriorityFeePerGas: ethers.utils.formatUnits(feeData.maxPriorityFeePerGas, "gwei") + " Gwei",
          inputDataLength: ethers.utils.hexDataLength(inputData),
          memo: memo || "No memo"
        });

      } else {
        // 传统交易 (type 0)
        const gasPrice = await this.provider.getGasPrice();
        
        txRequest = {
          to: toAddress,
          value: amountInWei,
          data: inputData, // 包含备注信息的input data
          type: 0, // Legacy transaction
          gasPrice: gasPrice,
        };

        // 进度回调：估算Gas
        if (this.isValidCallback(progressCallback)) {
          progressCallback(55, "正在估算Gas费用 (Legacy)...");
        }

        const gasEstimate = await signer.estimateGas(txRequest);
        gasCost = gasEstimate.mul(gasPrice);
        
        // 设置gas限制 (增加10%缓冲)
        txRequest.gasLimit = gasEstimate.mul(110).div(100);

        console.log("Preparing legacy transaction with memo:", {
          gasPrice: ethers.utils.formatUnits(gasPrice, "gwei") + " Gwei",
          inputDataLength: ethers.utils.hexDataLength(inputData),
          memo: memo || "No memo"
        });
      }

      // 计算总费用 (转账金额 + Gas费)
      const totalCost = amountInWei.add(gasCost);
      const balanceInWei = ethers.utils.parseEther(balance);

      if (balanceInWei.lt(totalCost)) {
        const gasCostInETH = ethers.utils.formatEther(gasCost);
        const totalCostInETH = ethers.utils.formatEther(totalCost);
        throw new Error(
          `余额不足支付Gas费。需要总计: ${totalCostInETH} ETH (转账: ${amount} ETH + Gas: ${gasCostInETH} ETH)`
        );
      }

      // 进度回调：发送交易
      if (this.isValidCallback(progressCallback)) {
        progressCallback(75, "正在发送ETH转账交易，等待钱包签名...");
      }

      console.log("Sending ETH transfer with input data:", {
        from: fromAddress,
        to: toAddress,
        amount: amount + " ETH",
        memo: memo || "No memo",
        inputData: inputData,
        inputDataSize: ethers.utils.hexDataLength(inputData) + " bytes",
        gasLimit: txRequest.gasLimit.toString(),
        transactionType: useEIP1559 ? "EIP-1559" : "Legacy",
      });

      // 发送交易 - 这里会调起钱包签名
      const tx = await signer.sendTransaction(txRequest);

      console.log("ETH transfer transaction sent:", tx.hash);

      // 进度回调：等待确认
      if (this.isValidCallback(progressCallback)) {
        progressCallback(90, "正在等待区块确认...");
      }

      // 等待交易确认
      const receipt = await tx.wait();

      console.log("ETH transfer confirmed:", receipt);

      // 进度回调：完成
      if (this.isValidCallback(progressCallback)) {
        progressCallback(100, "ETH转账成功！");
      }

      return {
        tx,
        receipt,
        amount,
        toAddress,
        fromAddress,
        memo,
        inputData,
        txHash: tx.hash,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice.toString(),
        status: receipt.status === 1 ? "success" : "failed",
        transactionType: useEIP1559 ? "EIP-1559" : "Legacy",
        memoIncludedOnChain: memo && memo.trim() !== "",
      };
    } catch (error) {
      console.error("ETH transfer failed:", error);
      if (this.isValidCallback(progressCallback)) {
        progressCallback(-1, `ETH转账失败: ${error.message}`);
      }
      this.handleTransferError(error);
    }
  }

  // 从区块链读取交易的备注信息
  async getTransactionMemo(txHash) {
    try {
      if (!this.provider || !txHash) return "";

      const tx = await this.provider.getTransaction(txHash);
      if (!tx || !tx.data) {
        return "";
      }

      return this.decodeMemoFromInputData(tx.data);
    } catch (error) {
      console.error("读取交易备注失败:", error);
      return "";
    }
  }

  // 获取地址的转账历史（包含备注信息）
  async getTransactionHistory(address, startBlock = 0, endBlock = "latest") {
    try {
      if (!this.provider) {
        throw new Error("Provider未初始化");
      }

      // 获取最新区块号
      const latestBlock = endBlock === "latest" ? await this.provider.getBlockNumber() : endBlock;
      const fromBlock = Math.max(startBlock, latestBlock - 10000); // 限制查询范围避免超时

      console.log(`查询地址 ${address} 从区块 ${fromBlock} 到 ${latestBlock} 的交易历史`);

      const history = [];
      
      // 查询最近的区块
      for (let blockNumber = latestBlock; blockNumber >= fromBlock; blockNumber--) {
        try {
          const block = await this.provider.getBlockWithTransactions(blockNumber);
          
          for (const tx of block.transactions) {
            // 检查是否与目标地址相关
            if (tx.from?.toLowerCase() === address.toLowerCase() || 
                tx.to?.toLowerCase() === address.toLowerCase()) {
              
              const receipt = await this.provider.getTransactionReceipt(tx.hash);
              const memo = this.decodeMemoFromInputData(tx.data);
              
              history.push({
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: ethers.utils.formatEther(tx.value || "0"),
                gasUsed: receipt.gasUsed.toString(),
                blockNumber: tx.blockNumber,
                timestamp: block.timestamp,
                memo: memo,
                status: receipt.status === 1 ? "success" : "failed",
                hasInputData: tx.data && tx.data !== "0x",
              });
            }
          }
        } catch (blockError) {
          console.warn(`获取区块 ${blockNumber} 失败:`, blockError);
        }
      }

      return history.sort((a, b) => b.blockNumber - a.blockNumber); // 按区块号降序排列
    } catch (error) {
      console.error("获取交易历史失败:", error);
      throw new Error("获取交易历史失败: " + error.message);
    }
  }

  async getCurrentNetwork() {
    try {
      if (!this.provider) {
        throw new Error("Provider未初始化");
      }

      const network = await this.provider.getNetwork();
      return {
        chainId: network.chainId,
        name: network.name,
        ensAddress: network.ensAddress,
      };
    } catch (error) {
      console.error("获取网络信息失败:", error);
      return null;
    }
  }

  async getGasPrice() {
    try {
      if (!this.provider) {
        throw new Error("Provider未初始化");
      }

      const useEIP1559 = await this.supportsEIP1559();
      
      if (useEIP1559) {
        const feeData = await this.provider.getFeeData();
        return {
          type: "EIP-1559",
          maxFeePerGas: feeData.maxFeePerGas.toString(),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas.toString(),
          maxFeePerGasGwei: ethers.utils.formatUnits(feeData.maxFeePerGas, "gwei"),
          maxPriorityFeePerGasGwei: ethers.utils.formatUnits(feeData.maxPriorityFeePerGas, "gwei"),
        };
      } else {
        const gasPrice = await this.provider.getGasPrice();
        return {
          type: "Legacy",
          gasPrice: gasPrice.toString(),
          gasPriceGwei: ethers.utils.formatUnits(gasPrice, "gwei"),
          gasPriceEth: ethers.utils.formatEther(gasPrice),
        };
      }
    } catch (error) {
      console.error("获取Gas价格失败:", error);
      throw new Error("获取Gas价格失败: " + error.message);
    }
  }

  async estimateTransferGas(toAddress, amount, memo = "") {
    try {
      const signer = await this.getSigner();
      const amountInWei = ethers.utils.parseEther(amount.toString());
      const inputData = this.encodeMemoToInputData(memo);
      const useEIP1559 = await this.supportsEIP1559();

      let txRequest;
      let gasCost;

      if (useEIP1559) {
        const feeData = await this.provider.getFeeData();
        txRequest = {
          to: toAddress,
          value: amountInWei,
          data: inputData,
          type: 2,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        };
        
        const gasEstimate = await signer.estimateGas(txRequest);
        gasCost = gasEstimate.mul(feeData.maxFeePerGas);

        return {
          transactionType: "EIP-1559",
          gasLimit: gasEstimate.toString(),
          maxFeePerGas: feeData.maxFeePerGas.toString(),
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas.toString(),
          gasCostWei: gasCost.toString(),
          gasCostETH: ethers.utils.formatEther(gasCost),
          maxFeePerGasGwei: ethers.utils.formatUnits(feeData.maxFeePerGas, "gwei"),
          maxPriorityFeePerGasGwei: ethers.utils.formatUnits(feeData.maxPriorityFeePerGas, "gwei"),
          inputDataSize: ethers.utils.hexDataLength(inputData) + " bytes",
          hasMemo: memo && memo.trim() !== "",
        };
      } else {
        const gasPrice = await this.provider.getGasPrice();
        txRequest = {
          to: toAddress,
          value: amountInWei,
          data: inputData,
          type: 0,
          gasPrice: gasPrice,
        };

        const gasEstimate = await signer.estimateGas(txRequest);
        gasCost = gasEstimate.mul(gasPrice);

        return {
          transactionType: "Legacy",
          gasLimit: gasEstimate.toString(),
          gasPrice: gasPrice.toString(),
          gasCostWei: gasCost.toString(),
          gasCostETH: ethers.utils.formatEther(gasCost),
          gasPriceGwei: ethers.utils.formatUnits(gasPrice, "gwei"),
          inputDataSize: ethers.utils.hexDataLength(inputData) + " bytes",
          hasMemo: memo && memo.trim() !== "",
        };
      }
    } catch (error) {
      console.error("估算Gas失败:", error);
      throw new Error("估算Gas失败: " + error.message);
    }
  }

  async getTransactionStatus(txHash) {
    try {
      if (!this.provider || !txHash) return null;

      const tx = await this.provider.getTransaction(txHash);
      const receipt = await this.provider.getTransactionReceipt(txHash);
      const memo = tx ? this.decodeMemoFromInputData(tx.data) : "";

      return {
        transaction: tx,
        receipt: receipt,
        memo: memo,
        status: receipt
          ? receipt.status === 1
            ? "success"
            : "failed"
          : "pending",
        confirmations: receipt ? receipt.confirmations : 0,
        blockNumber: receipt ? receipt.blockNumber : null,
        gasUsed: receipt ? receipt.gasUsed.toString() : null,
        hasInputData: tx && tx.data && tx.data !== "0x",
      };
    } catch (error) {
      console.error("获取交易状态失败:", error);
      return null;
    }
  }

  async waitForTransaction(txHash, confirmations = 1, progressCallback = null) {
    try {
      if (!this.provider || !txHash) return null;

      const tx = await this.provider.getTransaction(txHash);
      if (!tx) throw new Error("交易未找到");

      if (this.isValidCallback(progressCallback)) {
        progressCallback(50, "等待交易被打包...");
      }

      const receipt = await tx.wait(confirmations);

      if (this.isValidCallback(progressCallback)) {
        progressCallback(100, `交易确认完成 (${confirmations} 个确认)`);
      }

      return receipt;
    } catch (error) {
      if (this.isValidCallback(progressCallback)) {
        progressCallback(-1, `等待确认失败: ${error.message}`);
      }
      throw error;
    }
  }

  // 验证以太坊地址格式
  isValidAddress(address) {
    try {
      ethers.utils.getAddress(address);
      return true;
    } catch {
      return false;
    }
  }

  // 错误处理
  handleTransferError(error) {
    let message = "转账失败";

    if (error.code === "UNPREDICTABLE_GAS_LIMIT") {
      message = "交易可能会失败，请检查接收地址或转账金额";
    } else if (error.code === "INSUFFICIENT_FUNDS") {
      message = "余额不足，无法支付转账金额和Gas费用";
    } else if (error.code === "NETWORK_ERROR") {
      message = "网络连接错误，请检查网络设置";
    } else if (error.code === "TIMEOUT") {
      message = "交易超时，请重试";
    } else if (error.code === 4001) {
      message = "用户拒绝了交易";
    } else if (error.message) {
      if (error.message.includes("user rejected")) {
        message = "用户取消了交易";
      } else if (error.message.includes("insufficient funds")) {
        message = "余额不足";
      } else if (error.message.includes("gas required exceeds allowance")) {
        message = "Gas费用超出限制";
      } else if (error.message.includes("invalid address")) {
        message = "无效的以太坊地址";
      } else if (error.message.includes("transaction envelope type")) {
        message = "交易类型不兼容，已自动切换为兼容模式";
      } else {
        message = error.message;
      }
    }

    throw new Error(message);
  }
}

export default ETHTransferService;