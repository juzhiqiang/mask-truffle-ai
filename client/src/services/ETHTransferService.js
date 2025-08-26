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
        const address = await this.signer.getAddress();
        console.log("ETH Signer connected:", address);
      } catch (error) {
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
      return "0x";
    }
    
    try {
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
      return ethers.utils.toUtf8String(inputData);
    } catch (error) {
      console.warn("解码备注信息失败:", error);
      return "";
    }
  }

  async transferETH(toAddress, amount, memo = "", progressCallback = null) {
    try {
      if (this.isValidCallback(progressCallback)) {
        progressCallback(10, "正在获取钱包签名器...");
      }

      const signer = await this.getSigner();
      const fromAddress = await signer.getAddress();

      if (this.isValidCallback(progressCallback)) {
        progressCallback(25, "正在检查ETH余额...");
      }

      const balance = await this.getBalance(fromAddress);
      const balanceInETH = parseFloat(balance);
      const amountInETH = parseFloat(amount);

      if (balanceInETH < amountInETH) {
        throw new Error(
          `ETH余额不足。当前余额: ${balance} ETH, 需要: ${amount} ETH`
        );
      }

      if (this.isValidCallback(progressCallback)) {
        progressCallback(40, "正在准备转账交易...");
      }

      const amountInWei = ethers.utils.parseEther(amount.toString());
      const useEIP1559 = await this.supportsEIP1559();

      let txRequest;
      let gasCost;

      // 尝试包含备注，如果失败则使用无备注模式
      const inputData = this.encodeMemoToInputData(memo);
      let actualMemo = memo;
      let memoIncluded = false;

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

        if (this.isValidCallback(progressCallback)) {
          progressCallback(55, "正在估算Gas费用...");
        }

        try {
          const gasEstimate = await signer.estimateGas(txRequest);
          gasCost = gasEstimate.mul(feeData.maxFeePerGas);
          txRequest.gasLimit = gasEstimate.mul(110).div(100);
          memoIncluded = memo && memo.trim() !== "";
        } catch (estimateError) {
          // 如果包含备注的交易失败，尝试无备注版本
          if (memo && memo.trim() !== "" && 
              (estimateError.message.includes("External transactions to internal accounts cannot include data") ||
               estimateError.message.includes("cannot include data"))) {
            
            console.warn("网络不支持input data，切换为无备注模式");
            
            txRequest.data = "0x";
            actualMemo = "";
            memoIncluded = false;
            
            const gasEstimate = await signer.estimateGas(txRequest);
            gasCost = gasEstimate.mul(feeData.maxFeePerGas);
            txRequest.gasLimit = gasEstimate.mul(110).div(100);
          } else {
            throw estimateError;
          }
        }
      } else {
        const gasPrice = await this.provider.getGasPrice();
        
        txRequest = {
          to: toAddress,
          value: amountInWei,
          data: inputData,
          type: 0,
          gasPrice: gasPrice,
        };

        if (this.isValidCallback(progressCallback)) {
          progressCallback(55, "正在估算Gas费用...");
        }

        try {
          const gasEstimate = await signer.estimateGas(txRequest);
          gasCost = gasEstimate.mul(gasPrice);
          txRequest.gasLimit = gasEstimate.mul(110).div(100);
          memoIncluded = memo && memo.trim() !== "";
        } catch (estimateError) {
          // 如果包含备注的交易失败，尝试无备注版本
          if (memo && memo.trim() !== "" && 
              (estimateError.message.includes("External transactions to internal accounts cannot include data") ||
               estimateError.message.includes("cannot include data"))) {
            
            console.warn("网络不支持input data，切换为无备注模式");
            
            txRequest.data = "0x";
            actualMemo = "";
            memoIncluded = false;
            
            const gasEstimate = await signer.estimateGas(txRequest);
            gasCost = gasEstimate.mul(gasPrice);
            txRequest.gasLimit = gasEstimate.mul(110).div(100);
          } else {
            throw estimateError;
          }
        }
      }

      // 检查总费用
      const totalCost = amountInWei.add(gasCost);
      const balanceInWei = ethers.utils.parseEther(balance);

      if (balanceInWei.lt(totalCost)) {
        const gasCostInETH = ethers.utils.formatEther(gasCost);
        const totalCostInETH = ethers.utils.formatEther(totalCost);
        throw new Error(
          `余额不足支付Gas费。需要总计: ${totalCostInETH} ETH (转账: ${amount} ETH + Gas: ${gasCostInETH} ETH)`
        );
      }

      if (this.isValidCallback(progressCallback)) {
        progressCallback(75, "正在发送ETH转账交易，等待钱包签名...");
      }

      console.log("Sending ETH transfer:", {
        from: fromAddress,
        to: toAddress,
        amount: amount + " ETH",
        memo: actualMemo || "No memo",
        memoIncluded: memoIncluded,
        transactionType: useEIP1559 ? "EIP-1559" : "Legacy",
      });

      // 发送交易 - 调起钱包签名
      const tx = await signer.sendTransaction(txRequest);

      console.log("ETH transfer transaction sent:", tx.hash);

      if (this.isValidCallback(progressCallback)) {
        progressCallback(90, "正在等待区块确认...");
      }

      const receipt = await tx.wait();

      console.log("ETH transfer confirmed:", receipt);

      if (this.isValidCallback(progressCallback)) {
        progressCallback(100, "ETH转账成功！");
      }

      return {
        tx,
        receipt,
        amount,
        toAddress,
        fromAddress,
        memo: actualMemo,
        originalMemo: memo,
        txHash: tx.hash,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice.toString(),
        status: receipt.status === 1 ? "success" : "failed",
        transactionType: useEIP1559 ? "EIP-1559" : "Legacy",
        memoIncludedOnChain: memoIncluded,
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
      } else if (
        error.message.includes("External transactions to internal accounts cannot include data") ||
        error.message.includes("cannot include data")
      ) {
        message = "当前网络不支持在ETH转账中包含备注信息，已自动切换为无备注模式";
      } else {
        message = error.message;
      }
    }

    throw new Error(message);
  }
}

export default ETHTransferService;