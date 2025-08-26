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

  // 检查网络是否支持EOA转账中的input data
  async supportsInputDataInTransfers() {
    try {
      const network = await this.provider.getNetwork();
      
      // 已知不支持EOA转账包含data的网络
      const unsupportedChains = [
        // 可以根据实际情况添加不支持的网络ID
        // 例如某些Layer 2或企业网络
      ];
      
      // 检查是否为已知的不支持网络
      if (unsupportedChains.includes(network.chainId)) {
        return false;
      }
      
      // 主网和主要测试网支持
      const supportedChains = [1, 5, 11155111]; // mainnet, goerli, sepolia
      return supportedChains.includes(network.chainId);
    } catch (error) {
      console.warn("检查input data支持失败, 假设支持:", error);
      return true;
    }
  }

  // 检查地址是否为EOA（外部拥有账户）
  async isEOAAddress(address) {
    try {
      const code = await this.provider.getCode(address);
      return code === "0x" || code === "0x0";
    } catch (error) {
      console.warn("检查地址类型失败:", error);
      return true; // 假设是EOA
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

  // 测试是否可以发送带有input data的交易
  async testInputDataSupport(toAddress, amount, memo) {
    try {
      const signer = await this.getSigner();
      const amountInWei = ethers.utils.parseEther(amount.toString());
      const inputData = this.encodeMemoToInputData(memo);
      const useEIP1559 = await this.supportsEIP1559();

      let txRequest;

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
      } else {
        const gasPrice = await this.provider.getGasPrice();
        txRequest = {
          to: toAddress,
          value: amountInWei,
          data: inputData,
          type: 0,
          gasPrice: gasPrice,
        };
      }

      // 尝试估算gas - 如果失败则说明不支持
      await signer.estimateGas(txRequest);
      return true;
    } catch (error) {
      console.warn("Input data测试失败:", error.message);
      
      // 检查是否为特定的错误类型
      if (
        error.message.includes("External transactions to internal accounts cannot include data") ||
        error.message.includes("cannot include data") ||
        error.code === -32602
      ) {
        return false;
      }
      
      // 其他错误也认为不支持
      return false;
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
        progressCallback(40, "正在检查网络兼容性...");
      }

      // 转换金额为Wei
      const amountInWei = ethers.utils.parseEther(amount.toString());

      // 检查网络是否支持EIP-1559
      const useEIP1559 = await this.supportsEIP1559();

      let txRequest;
      let gasCost;
      let canIncludeMemo = false;
      let actualMemo = memo;

      // 如果有备注，测试是否支持input data
      if (memo && memo.trim() !== "") {
        if (this.isValidCallback(progressCallback)) {
          progressCallback(45, "正在测试备注兼容性...");
        }

        // 检查目标地址是否为EOA
        const isEOA = await this.isEOAAddress(toAddress);
        
        if (isEOA) {
          // 测试是否可以包含input data
          canIncludeMemo = await this.testInputDataSupport(toAddress, amount, memo);
        } else {
          // 发送到合约地址通常可以包含data（虽然我们不使用合约逻辑）
          canIncludeMemo = true;
        }

        console.log(`备注兼容性检查: 目标地址EOA=${isEOA}, 支持Input Data=${canIncludeMemo}`);
      }

      // 如果不能包含备注，提供用户选择
      if (memo && memo.trim() !== "" && !canIncludeMemo) {
        const errorMsg = `当前网络不支持在ETH转账中包含备注信息。备注信息将不会被包含在区块链交易中。是否继续进行无备注的转账？`;
        
        // 这里可以通过回调让用户选择
        if (this.isValidCallback(progressCallback)) {
          progressCallback(-1, errorMsg);
        }
        
        // 抛出错误让调用者处理
        throw new Error(errorMsg);
      }

      // 编码备注信息（如果支持）
      const inputData = canIncludeMemo ? this.encodeMemoToInputData(memo) : "0x";
      if (!canIncludeMemo) {
        actualMemo = ""; // 清空备注
      }

      if (useEIP1559) {
        // EIP-1559 交易 (type 2)
        const feeData = await this.provider.getFeeData();
        
        txRequest = {
          to: toAddress,
          value: amountInWei,
          data: inputData, // 可能为空
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

        console.log("Preparing EIP-1559 transaction:", {
          maxFeePerGas: ethers.utils.formatUnits(feeData.maxFeePerGas, "gwei") + " Gwei",
          maxPriorityFeePerGas: ethers.utils.formatUnits(feeData.maxPriorityFeePerGas, "gwei") + " Gwei",
          inputDataLength: ethers.utils.hexDataLength(inputData),
          memo: actualMemo || "No memo",
          memoOnChain: canIncludeMemo
        });

      } else {
        // 传统交易 (type 0)
        const gasPrice = await this.provider.getGasPrice();
        
        txRequest = {
          to: toAddress,
          value: amountInWei,
          data: inputData, // 可能为空
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

        console.log("Preparing legacy transaction:", {
          gasPrice: ethers.utils.formatUnits(gasPrice, "gwei") + " Gwei",
          inputDataLength: ethers.utils.hexDataLength(inputData),
          memo: actualMemo || "No memo",
          memoOnChain: canIncludeMemo
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

      console.log("Sending ETH transfer:", {
        from: fromAddress,
        to: toAddress,
        amount: amount + " ETH",
        memo: actualMemo || "No memo",
        inputData: inputData,
        inputDataSize: ethers.utils.hexDataLength(inputData) + " bytes",
        gasLimit: txRequest.gasLimit.toString(),
        transactionType: useEIP1559 ? "EIP-1559" : "Legacy",
        memoOnChain: canIncludeMemo
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
        memo: actualMemo,
        originalMemo: memo, // 用户原始输入的备注
        inputData,
        txHash: tx.hash,
        gasUsed: receipt.gasUsed.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice.toString(),
        status: receipt.status === 1 ? "success" : "failed",
        transactionType: useEIP1559 ? "EIP-1559" : "Legacy",
        memoIncludedOnChain: canIncludeMemo && actualMemo !== "",
        networkSupportsMemo: canIncludeMemo,
      };
    } catch (error) {
      console.error("ETH transfer failed:", error);
      if (this.isValidCallback(progressCallback)) {
        progressCallback(-1, `ETH转账失败: ${error.message}`);
      }
      this.handleTransferError(error);
    }
  }

  // 简化版转账（不包含备注，确保兼容性）
  async transferETHWithoutMemo(toAddress, amount, progressCallback = null) {
    return await this.transferETH(toAddress, amount, "", progressCallback);
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
      const supportsMemo = await this.supportsInputDataInTransfers();
      
      return {
        chainId: network.chainId,
        name: network.name,
        ensAddress: network.ensAddress,
        supportsMemoInTransfers: supportsMemo,
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
      
      // 首先尝试包含备注
      let canIncludeMemo = false;
      if (memo && memo.trim() !== "") {
        canIncludeMemo = await this.testInputDataSupport(toAddress, amount, memo);
      }
      
      const inputData = canIncludeMemo ? this.encodeMemoToInputData(memo) : "0x";
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
          canIncludeMemo: canIncludeMemo,
          networkSupportsMemo: canIncludeMemo,
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
          canIncludeMemo: canIncludeMemo,
          networkSupportsMemo: canIncludeMemo,
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
        message = "当前网络不支持在ETH转账中包含备注信息，请选择是否继续无备注转账";
      } else {
        message = error.message;
      }
    }

    throw new Error(message);
  }
}

export default ETHTransferService;