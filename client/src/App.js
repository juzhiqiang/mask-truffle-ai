import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Menu, Card, Form, Input, InputNumber, Button, Row, Col, message, Tabs, Table, Modal, Badge, Typography, Space, Divider, Select, Switch, Alert } from 'antd';
import { SendOutlined, HistoryOutlined, WalletOutlined, DatabaseOutlined, EyeOutlined, FileTextOutlined, CloudDownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { Web3ReactProvider } from '@web3-react/core';
import { ethers } from 'ethers';

// 导入组件和服务
import WalletConnection from './components/WalletConnection';
import ProgressBar from './components/ProgressBar';
import ETHTransferService from './services/ETHTransferService';
import USDTService from './services/USDTService';
import InfuraService from './services/InfuraService';
import LogChainService from './services/LogChainService';
import TheGraphService from './services/TheGraphService';
import './App.css';

const { Header, Content, Footer } = Layout;
const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;

// Web3React 库函数
function getLibrary(provider) {
  const library = new ethers.providers.Web3Provider(provider);
  library.pollingInterval = 12000;
  return library;
}

function AppContent() {
  // 状态管理
  const [account, setAccount] = useState(null);
  const [ethBalance, setEthBalance] = useState('0');
  const [usdtBalance, setUsdtBalance] = useState('0');
  const [network, setNetwork] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ethTransferRecords, setEthTransferRecords] = useState([]);
  const [usdtTransferRecords, setUsdtTransferRecords] = useState([]);
  const [logUploadRecords, setLogUploadRecords] = useState([]);
  const [activeTab, setActiveTab] = useState('eth-transfer'); // 新增：追踪当前活动标签
  const [searchText, setSearchText] = useState(''); // 新增：搜索文本
  
  // The Graph 相关状态
  const [graphDataEnabled, setGraphDataEnabled] = useState(false);
  const [graphDataLoading, setGraphDataLoading] = useState(false);
  const [graphRecords, setGraphRecords] = useState([]);
  const [graphHealthStatus, setGraphHealthStatus] = useState(null);
  const [txHashSearchResults, setTxHashSearchResults] = useState([]);
  const [txHashSearchLoading, setTxHashSearchLoading] = useState(false);
  
  // 进度条状态
  const [progressVisible, setProgressVisible] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [progressMessage, setProgressMessage] = useState('');

  // Modal状态
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // 表单实例
  const [ethTransferForm] = Form.useForm();
  const [usdtTransferForm] = Form.useForm();
  const [logUploadForm] = Form.useForm();

  // 服务实例
  const [ethTransferService] = useState(() => new ETHTransferService());
  const [usdtService] = useState(() => new USDTService());
  const [infuraService] = useState(() => new InfuraService());
  const [logChainService] = useState(() => new LogChainService());
  const [theGraphService] = useState(() => new TheGraphService());

  // 进度条控制函数
  const showProgress = () => setProgressVisible(true);
  const hideProgress = () => setProgressVisible(false);
  const updateProgress = (percent, message) => {
    setProgressPercent(percent);
    setProgressMessage(message);
    
    if (percent >= 100) {
      setProgressStatus('success');
      setTimeout(hideProgress, 2000);
    } else if (percent < 0) {
      setProgressStatus('exception');
      setTimeout(hideProgress, 3000);
    } else {
      setProgressStatus('active');
    }
  };

  // 安全的USDT余额获取函数
  const safeGetUSDTBalance = async (walletAccount) => {
    try {
      // 检查当前网络是否支持USDT
      const supportedNetwork = await usdtService.isCurrentNetworkSupported();
      if (!supportedNetwork) {
        console.log('当前网络不支持USDT，跳过余额获取');
        return '0';
      }

      const usdtBal = await usdtService.getUSDTBalance(walletAccount);
      return usdtBal;
    } catch (error) {
      console.error('获取USDT余额失败:', error);
      // 返回默认值而不是抛出错误
      return '0';
    }
  };

  // 钱包账户变化回调
  const handleAccountChange = useCallback(async (walletAccount) => {
    try {
      if (walletAccount) {
        setAccount(walletAccount);
        console.log('Wallet connected:', walletAccount);
        
        // 获取ETH余额
        try {
          const ethBal = await ethTransferService.getBalance(walletAccount);
          setEthBalance(ethBal);
        } catch (error) {
          console.error('Failed to get ETH balance:', error);
          setEthBalance('0');
        }

        // 只有在USDT转账页面时才获取USDT余额
        if (activeTab === 'usdt-transfer') {
          const usdtBal = await safeGetUSDTBalance(walletAccount);
          setUsdtBalance(usdtBal);
        }

        // 获取网络信息并初始化The Graph
        try {
          const networkInfo = await ethTransferService.getCurrentNetwork();
          setNetwork(networkInfo);
          
          // 初始化The Graph服务
          if (networkInfo && networkInfo.name) {
            await initTheGraphService(networkInfo.name);
          }
        } catch (error) {
          console.error('Failed to get network info:', error);
        }

        // 加载交易记录
        loadTransactionRecords();

        // 注释掉自动获取链上交易记录，改为用户手动搜索触发
        // fetchLatestOnChainTransactions(walletAccount);

      } else {
        // 钱包断开连接
        setAccount(null);
        setEthBalance('0');
        setUsdtBalance('0');
        setNetwork(null);
        setEthTransferRecords([]);
        setUsdtTransferRecords([]);
        setLogUploadRecords([]);
      }
    } catch (error) {
      console.error('Account change error:', error);
      message.error('钱包状态更新失败: ' + error.message);
    }
  }, [activeTab, ethTransferService, usdtService]);

  // 处理标签页切换
  const handleTabChange = async (key) => {
    setActiveTab(key);
    
    // 只有切换到USDT转账页面时才获取USDT余额
    if (key === 'usdt-transfer' && account) {
      try {
        const usdtBal = await safeGetUSDTBalance(account);
        setUsdtBalance(usdtBal);
      } catch (error) {
        console.error('切换到USDT页面时获取余额失败:', error);
      }
    }
  };

  // The Graph 功能函数
  // 初始化The Graph服务
  const initTheGraphService = async (networkName) => {
    try {
      const success = theGraphService.setNetwork(networkName);
      if (success) {
        const healthStatus = await theGraphService.healthCheck();
        setGraphHealthStatus(healthStatus);
        console.log('The Graph service initialized:', healthStatus);
        
        if (healthStatus.status === 'healthy') {
          // 不自动启用，保持开关关闭状态，让用户主动选择
          console.log('The Graph 服务可用，等待用户主动开启查询');
        }
      } else {
        setGraphDataEnabled(false);
        setGraphHealthStatus({ status: 'not_supported', message: `Network ${networkName} not supported` });
      }
    } catch (error) {
      console.error('Failed to initialize The Graph service:', error);
      setGraphDataEnabled(false);
      setGraphHealthStatus({ status: 'error', message: error.message });
    }
  };

  // 从The Graph加载最近的数据（用户手动刷新时）
  const loadGraphData = async () => {
    if (!graphDataEnabled || !theGraphService.isAvailable()) return;

    setGraphDataLoading(true);
    try {
      // 获取最近20条链上数据，按时间戳降序排列
      const recentData = await theGraphService.getAllDataStoredEvents(20, 0, 'timestamp', 'desc');
      console.log('Loaded recent Graph data:', recentData);
      
      // 转换为应用内的记录格式
      const formattedRecords = recentData.map(data => ({
        id: data.id,
        logId: data.logId,
        creator: data.creator,
        dataType: 'chaindata',
        token: data.dataType || 'DATA',
        amount: `Log ${data.logId}`,
        toAddress: data.toAddress || 'Chain Storage',
        fromAddress: data.fromAddress || data.creator,
        txHash: data.txHash,
        blockNumber: data.blockNumber,
        status: 'success',
        date: data.date,
        timestamp: data.timestamp,
        onChainMemo: data.content,
        value: data.value,
        contractAddress: data.contractAddress,
        inputData: data.inputData,
        onChainContent: data.onChainContent,
        transactionTime: data.transactionTime,
        transactionFee: data.transactionFee,
        gasPrice: data.gasPrice,
        customData: {
          messageType: data.dataType, // 使用 dataType 作为 messageType
          value: data.value,
          toAddress: data.toAddress,
          fromAddress: data.fromAddress,
          transactionHash: data.txHash,
          blockNumber: data.blockNumber,
          contractAddress: data.contractAddress,
          inputData: data.inputData,
          onChainContent: data.onChainContent || data.content,
          transactionTime: data.transactionTime,
          transactionFee: data.transactionFee,
          gasPrice: data.gasPrice,
          gasUsed: data.gasUsed || '0',
          gasLimit: data.gasLimit || '0',
          // 保留其他字段用于兼容性
          logId: data.logId,
          dataType: data.dataType,
          content: data.content,
          dataHash: data.dataHash,
          creator: data.creator,
          source: 'thegraph'
        }
      }));

      // 替换现有数据而不是合并，确保显示最新的20条
      setGraphRecords(formattedRecords);
    } catch (error) {
      console.error('Failed to load Graph data:', error);
      message.error('加载链上数据失败: ' + error.message);
    } finally {
      setGraphDataLoading(false);
    }
  };

  // 通过交易哈希查询链上ETH转账数据
  const searchETHTransferByHash = async (txHash) => {
    if (!txHash || txHash.length < 10) {
      message.warning('请输入有效的交易哈希');
      return;
    }

    if (!infuraService.validateInfuraConfig()) {
      message.error('Infura服务未配置，无法查询链上数据');
      return;
    }

    setLoading(true);
    try {
      console.log('查询交易哈希:', txHash);
      
      // 获取当前网络信息
      const currentNetwork = await ethTransferService.getCurrentNetwork();
      
      // 使用 Infura 服务查询交易详情
      const txData = await infuraService.getTransactionWithMemo(txHash, currentNetwork?.chainId);
      
      if (txData) {
        // 处理时间戳 - 区块时间戳是秒级，需要转换为毫秒
        const timestamp = txData.timestamp ? txData.timestamp * 1000 : Date.now();
        
        // 转换为ETH转账记录格式，包含完整的交易详情
        const ethTransferRecord = {
          id: txHash,
          dataType: 'transfer',
          txHash: txHash,
          amount: txData.value || '0',
          token: 'ETH',
          toAddress: txData.to,
          fromAddress: txData.from,
          blockNumber: txData.blockNumber,
          status: txData.status === 'success' ? 'success' : 'failed',
          gasUsed: txData.gasUsed?.toString(),
          onChainMemo: txData.memo,
          timestamp: new Date(timestamp).toISOString(),
          date: new Date(timestamp).toLocaleString(),
          inputData: txData.inputData || '0x',
          value: txData.value || '0',
          customData: {
            memo: txData.memo,
            isContract: false,
            // 添加完整的交易详情
            messageType: 'ETH Transfer',
            transactionHash: txHash,
            onChainContent: txData.memo || 'ETH Transfer',
            transactionTime: new Date(timestamp).toLocaleString(),
            transactionFee: txData.receipt ? 
              (parseFloat(ethers.utils.formatEther(txData.receipt.gasUsed.mul(txData.transaction.gasPrice))).toFixed(6) + ' ETH') : 
              '0 ETH',
            gasPrice: txData.transaction?.gasPrice ? 
              ethers.utils.formatUnits(txData.transaction.gasPrice, 'gwei') + ' Gwei' : 
              '0 Gwei',
            gasUsed: txData.gasUsed || '0',
            gasLimit: txData.transaction?.gasLimit?.toString() || '0',
            confirmations: txData.confirmations || 0
          }
        };

        // 与现有记录合并，如果记录已存在则移到最前面
        setEthTransferRecords(prev => {
          // 移除可能已存在的相同交易哈希记录（避免重复）
          const filteredPrev = prev.filter(record => record.txHash !== txHash);
          // 将新记录放到最前面
          return [ethTransferRecord, ...filteredPrev];
        });
        message.success('找到该交易哈希的链上数据');
      } else {
        // 如果没找到数据，不清空现有记录，只显示提示
        message.info('未找到该交易哈希的链上数据');
      }
    } catch (error) {
      console.error('交易哈希搜索失败:', error);
      // 出现错误时不清空现有记录，只显示错误信息
      message.error('搜索失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 查询刚上链的日志数据
  const queryFreshChainData = async (txHash, logId) => {
    if (!theGraphService.isAvailable()) {
      console.log('The Graph 服务不可用，无法查询刚上链的数据');
      return;
    }

    try {
      console.log('查询刚上链的数据:', { txHash, logId });
      
      // 等待一小段时间让数据同步到 The Graph
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 使用专门的交易哈希查询方法，精确查询新上链的数据
      const freshData = await theGraphService.getDataByTransactionHash(txHash);
      
      if (freshData.length > 0) {
        console.log('找到刚上链的数据:', freshData);
        
        // 转换为应用内的记录格式
        const formattedRecords = freshData.map(data => ({
          id: data.id,
          logId: data.logId,
          creator: data.creator,
          dataType: 'chaindata',
          token: data.dataType || 'DATA',
          amount: `Log ${data.logId}`,
          toAddress: data.toAddress || 'Chain Storage',
          fromAddress: data.fromAddress || data.creator,
          txHash: data.txHash,
          blockNumber: data.blockNumber,
          status: 'success',
          date: data.date,
          timestamp: data.timestamp,
          onChainMemo: data.content,
          value: data.value,
          contractAddress: data.contractAddress,
          inputData: data.inputData,
          onChainContent: data.onChainContent,
          transactionTime: data.transactionTime,
          transactionFee: data.transactionFee,
          gasPrice: data.gasPrice,
          customData: {
            messageType: data.dataType,
            value: data.value,
            toAddress: data.toAddress,
            fromAddress: data.fromAddress,
            transactionHash: data.txHash,
            blockNumber: data.blockNumber,
            contractAddress: data.contractAddress,
            inputData: data.inputData,
            onChainContent: data.onChainContent || data.content,
            transactionTime: data.transactionTime,
            transactionFee: data.transactionFee,
            gasPrice: data.gasPrice,
            gasUsed: data.gasUsed || '0',
            gasLimit: data.gasLimit || '0',
            logId: data.logId,
            dataType: data.dataType,
            content: data.content,
            dataHash: data.dataHash,
            creator: data.creator,
            source: 'thegraph'
          }
        }));

        // 将新数据添加到表格最前面
        setGraphRecords(prev => {
          // 移除可能已存在的相同交易哈希记录（避免重复）
          const filteredPrev = prev.filter(record => record.txHash !== txHash);
          // 将新记录放到最前面
          return [...formattedRecords, ...filteredPrev];
        });
        
        // 如果 The Graph 查询还未开启，自动开启以显示刚上链的数据
        if (!graphDataEnabled) {
          setGraphDataEnabled(true);
        }
        
        message.success('已从链上查询到刚上传的日志数据，已添加到记录最前面');
      } else {
        console.log('The Graph 中暂未找到刚上链的数据，可能需要更多时间同步');
        // 可以设置一个重试机制
        setTimeout(() => {
          console.log('重试查询刚上链的数据...');
          queryFreshChainData(txHash, logId);
        }, 5000);
      }
    } catch (error) {
      console.error('查询刚上链的数据失败:', error);
    }
  };
  // 通过交易哈希搜索 The Graph 历史数据
  const searchByTransactionHash = async (txHash) => {
    if (!txHash || txHash.length < 10) {
      message.warning('请输入有效的交易哈希');
      return;
    }

    if (!theGraphService.isAvailable()) {
      message.error('The Graph 服务不可用，请先连接支持的网络');
      return;
    }

    setGraphDataLoading(true);
    try {
      // 使用专门的交易哈希查询方法
      const matchedData = await theGraphService.getDataByTransactionHash(txHash);
      
      if (matchedData.length > 0) {
        // 转换为应用内的记录格式
        const formattedRecords = matchedData.map(data => ({
          id: data.id,
          logId: data.logId,
          creator: data.creator,
          dataType: 'chaindata',
          token: data.dataType || 'DATA',
          amount: `Log ${data.logId}`,
          toAddress: data.toAddress || 'Chain Storage',
          fromAddress: data.fromAddress || data.creator,
          txHash: data.txHash,
          blockNumber: data.blockNumber,
          status: 'success',
          date: data.date,
          timestamp: data.timestamp,
          onChainMemo: data.content,
          value: data.value,
          contractAddress: data.contractAddress,
          inputData: data.inputData,
          onChainContent: data.onChainContent,
          transactionTime: data.transactionTime,
          transactionFee: data.transactionFee,
          gasPrice: data.gasPrice,
          customData: {
            messageType: data.dataType,
            value: data.value,
            toAddress: data.toAddress,
            fromAddress: data.fromAddress,
            transactionHash: data.txHash,
            blockNumber: data.blockNumber,
            contractAddress: data.contractAddress,
            inputData: data.inputData,
            onChainContent: data.onChainContent || data.content,
            transactionTime: data.transactionTime,
            transactionFee: data.transactionFee,
            gasPrice: data.gasPrice,
            gasUsed: data.gasUsed || '0',
            gasLimit: data.gasLimit || '0',
            logId: data.logId,
            dataType: data.dataType,
            content: data.content,
            dataHash: data.dataHash,
            creator: data.creator,
            source: 'thegraph'
          }
        }));

        // 替换现有数据，只显示搜索到的交易数据
        setGraphRecords(formattedRecords);
        message.success(`找到 ${matchedData.length} 条该交易哈希的链上数据记录`);
      } else {
        // 如果没找到数据，清空现有记录
        setGraphRecords([]);
        message.info('未找到该交易哈希的链上数据记录');
      }
    } catch (error) {
      console.error('交易哈希搜索失败:', error);
      message.error('搜索失败: ' + error.message);
    } finally {
      setGraphDataLoading(false);
    }
  };
  const refreshGraphData = async () => {
    await loadGraphData();
    message.success('链上数据已刷新');
  };

  // 切换The Graph数据显示
  const handleGraphDataToggle = async (enabled) => {
    setGraphDataEnabled(enabled);
    if (enabled && account) {
      // 用户主动开启时才查询数据
      await loadGraphData();
    } else {
      // 关闭时清空数据
      setGraphRecords([]);
    }
  };

  // 从链上获取备注信息
  const fetchOnChainMemo = async (txHash, chainId) => {
    try {
      if (!infuraService.validateInfuraConfig()) {
        console.warn('Infura未配置，无法获取链上数据');
        return null;
      }

      const txData = await infuraService.getTransactionWithMemo(txHash, chainId);
      return txData.memo;
    } catch (error) {
      console.error('获取链上备注失败:', error);
      return null;
    }
  };

  // 更新交易记录的链上备注
  const updateRecordWithOnChainMemo = async (record) => {
    if (!record.txHash) return record;
    
    try {
      console.log('正在获取交易的链上数据:', record.txHash);
      const currentNetwork = await ethTransferService.getCurrentNetwork();
      const onChainMemo = await fetchOnChainMemo(record.txHash, currentNetwork?.chainId);
      
      if (onChainMemo) {
        console.log('获取到链上备注:', onChainMemo);
        return {
          ...record,
          onChainMemo,
          customData: {
            ...record.customData,
            onChainMemo
          }
        };
      } else {
        console.log('没有找到链上备注:', record.txHash);
      }
    } catch (error) {
      console.error('更新链上备注失败:', record.txHash, error);
    }
    
    return record;
  };

  // 保存ETH转账记录
  const saveEthTransferRecord = (record) => {
    console.log('保存新的ETH转账记录:', record);
    const newRecord = {
      ...record,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleString()
    };
    const updatedRecords = [newRecord, ...ethTransferRecords];
    console.log('更新后的ETH转账记录总数:', updatedRecords.length);
    setEthTransferRecords(updatedRecords);
  };

  // 保存USDT转账记录
  const saveUsdtTransferRecord = (record) => {
    console.log('保存新的USDT转账记录:', record);
    const newRecord = {
      ...record,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleString()
    };
    const updatedRecords = [newRecord, ...usdtTransferRecords];
    console.log('更新后的USDT转账记录总数:', updatedRecords.length);
    setUsdtTransferRecords(updatedRecords);
  };

  // 保存日志上链记录
  const saveLogUploadRecord = (record) => {
    console.log('保存新的日志上链记录:', record);
    const newRecord = {
      ...record,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleString()
    };
    const updatedRecords = [newRecord, ...logUploadRecords];
    console.log('更新后的日志上链记录总数:', updatedRecords.length);
    setLogUploadRecords(updatedRecords);
  };

  // 从链上获取当前钱包最新的2条ETH转账记录
  const fetchLatestOnChainTransactions = async (walletAddress) => {
    if (!walletAddress) {
      console.log('没有钱包地址，跳过链上交易获取');
      return;
    }

    try {
      console.log('开始获取钱包最新ETH转账记录:', walletAddress);
      
      // 使用Infura服务更高效地获取交易记录
      // 注意：这里我们使用一个简化的方法，实际可能需要使用Etherscan API
      // 为了演示，我们先尝试获取最新几个区块的交易
      const currentNetwork = await ethTransferService.getCurrentNetwork();
      if (!currentNetwork) {
        console.log('未获取到网络信息，跳过自动加载');
        return;
      }

      // 获取最新区块号
      const provider = await ethTransferService.getProvider();
      const latestBlock = await provider.getBlockNumber();
      console.log('当前最新区块:', latestBlock);

      const ethRecords = [];
      let blocksChecked = 0;
      const maxBlocksToCheck = 50; // 只检查最近50个区块，提高效率

      // 从最新区块开始向前检查
      for (let blockNum = latestBlock; blockNum > latestBlock - maxBlocksToCheck && ethRecords.length < 2; blockNum--) {
        try {
          const block = await provider.getBlockWithTransactions(blockNum);
          
          if (block && block.transactions) {
            // 查找与该钱包地址相关的ETH转账
            for (const tx of block.transactions) {
              if (ethRecords.length >= 2) break;
              
              if ((tx.from?.toLowerCase() === walletAddress.toLowerCase() || 
                   tx.to?.toLowerCase() === walletAddress.toLowerCase()) &&
                  tx.value && !tx.value.isZero()) {
                
                // 获取交易回执
                try {
                  const receipt = await provider.getTransactionReceipt(tx.hash);
                  
                  const ethRecord = {
                    dataType: 'transfer',
                    txHash: tx.hash,
                    amount: ethers.utils.formatEther(tx.value),
                    token: 'ETH',
                    toAddress: tx.to,
                    fromAddress: tx.from,
                    inputData: tx.data || '0x',
                    blockNumber: tx.blockNumber,
                    status: receipt?.status === 1 ? 'success' : 'failed',
                    gasUsed: receipt?.gasUsed?.toString() || '0',
                    onChainMemo: tx.data && tx.data !== '0x' ? 'Has Input Data' : '',
                    id: tx.hash,
                    timestamp: new Date(block.timestamp * 1000).toISOString(),
                    date: new Date(block.timestamp * 1000).toLocaleString(),
                    value: ethers.utils.formatEther(tx.value),
                    customData: {
                      memo: tx.data && tx.data !== '0x' ? 'Has Input Data' : '',
                      isContract: false,
                      messageType: 'ETH Transfer',
                      transactionHash: tx.hash,
                      onChainContent: tx.data && tx.data !== '0x' ? 'ETH Transfer with Data' : 'ETH Transfer',
                      transactionTime: new Date(block.timestamp * 1000).toLocaleString(),
                      transactionFee: receipt ? 
                        (parseFloat(ethers.utils.formatEther(receipt.gasUsed.mul(tx.gasPrice))).toFixed(6) + ' ETH') : 
                        '0 ETH',
                      gasPrice: tx.gasPrice ? 
                        ethers.utils.formatUnits(tx.gasPrice, 'gwei') + ' Gwei' : 
                        '0 Gwei',
                      gasUsed: receipt?.gasUsed?.toString() || '0',
                      gasLimit: tx.gasLimit?.toString() || '0'
                    }
                  };

                  ethRecords.push(ethRecord);
                } catch (receiptError) {
                  console.warn('获取交易回执失败:', receiptError);
                }
              }
            }
          }
          blocksChecked++;
        } catch (blockError) {
          console.warn(`获取区块 ${blockNum} 失败:`, blockError);
        }
      }

      if (ethRecords.length > 0) {
        console.log(`获取到 ${ethRecords.length} 条最新ETH转账记录`);
        setEthTransferRecords(ethRecords);
        console.log('ETH链上交易记录已自动加载');
      } else {
        console.log('在最近的区块中没有找到ETH转账记录');
        // 设置空数组，清除可能存在的旧记录
        setEthTransferRecords([]);
      }
    } catch (error) {
      console.error('获取链上ETH转账记录失败:', error);
      // 设置空数组，确保界面状态正确
      setEthTransferRecords([]);
    }
  };

  // 初始化时不加载本地缓存数据
  const loadTransactionRecords = async () => {
    console.log('初始化交易记录状态（不从本地缓存加载）');
    setEthTransferRecords([]);
    setUsdtTransferRecords([]);
    setLogUploadRecords([]);
  };

  // ETH转账记录 - 不再进行前端过滤，交易哈希搜索通过链上查询处理
  const filteredEthRecords = React.useMemo(() => {
    const allRecords = [...ethTransferRecords];
    
    // 按时间戳排序（最新的在前）
    allRecords.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
    
    return allRecords;
  }, [ethTransferRecords]);

  // 过滤USDT转账记录
  const filteredUsdtRecords = React.useMemo(() => {
    const allRecords = [...usdtTransferRecords];
    
    // 按时间戳排序（最新的在前）
    allRecords.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
    
    if (!searchText) return allRecords;
    
    const searchLower = searchText.toLowerCase();
    return allRecords.filter(record => {
      return (
        record.token?.toLowerCase().includes(searchLower) ||
        record.toAddress?.toLowerCase().includes(searchLower) ||
        record.fromAddress?.toLowerCase().includes(searchLower) ||
        record.txHash?.toLowerCase().includes(searchLower) ||
        record.amount?.toString().includes(searchLower) ||
        record.status?.toLowerCase().includes(searchLower) ||
        record.customData?.memo?.toLowerCase().includes(searchLower) ||
        record.onChainMemo?.toLowerCase().includes(searchLower)
      );
    });
  }, [usdtTransferRecords, searchText]);

  // 过滤日志上链记录
  const filteredLogRecords = React.useMemo(() => {
    const allRecords = [...logUploadRecords];
    
    // 按时间戳排序（最新的在前）
    allRecords.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
    
    if (!searchText) return allRecords;
    
    const searchLower = searchText.toLowerCase();
    return allRecords.filter(record => {
      return (
        record.logType?.toLowerCase().includes(searchLower) ||
        record.logData?.toLowerCase().includes(searchLower) ||
        record.txHash?.toLowerCase().includes(searchLower) ||
        record.status?.toLowerCase().includes(searchLower) ||
        record.contractAddress?.toLowerCase().includes(searchLower)
      );
    });
  }, [logUploadRecords, searchText]);

  // 过滤链上数据记录 - 仅显示 The Graph 查询的真实链上数据
  const filteredChainDataRecords = React.useMemo(() => {
    // 只使用 The Graph 数据，不包含本地日志记录
    const allRecords = graphDataEnabled ? [...graphRecords] : [];
    
    // 按时间戳排序（最新的在前）
    allRecords.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });
    
    if (!searchText) return allRecords;
    
    const searchLower = searchText.toLowerCase();
    return allRecords.filter(record => {
      return (
        record.customData?.content?.toLowerCase().includes(searchLower) ||
        record.customData?.dataType?.toLowerCase().includes(searchLower) ||
        record.txHash?.toLowerCase().includes(searchLower) ||
        record.fromAddress?.toLowerCase().includes(searchLower) ||
        record.customData?.logId?.toString().includes(searchLower) ||
        record.contractAddress?.toLowerCase().includes(searchLower) ||
        record.content?.toLowerCase().includes(searchLower)
      );
    });
  }, [graphRecords, searchText, graphDataEnabled]);

  // 组件挂载时加载数据
  useEffect(() => {
    loadTransactionRecords();
    // 移除这里的loadCustomDataRecords调用，因为它现在需要account参数
  }, []);

  // ETH转账处理
  const handleETHTransfer = async (values) => {
    if (!account) {
      message.error('请先连接钱包');
      return;
    }

    setLoading(true);
    showProgress();
    
    try {
      updateProgress(5, '开始ETH转账...');

      // 直接进行转账，如果有备注且无法写入Input Data则失败
      const result = await ethTransferService.transferETH(
        values.toAddress,
        values.amount,
        values.memo || '',
        updateProgress
      );

      // 保存交易记录 - 格式与查询时保持一致
      const ethRecord = {
        dataType: 'transfer',
        txHash: result.txHash,
        amount: result.amount,
        value: result.amount,
        token: 'ETH',
        toAddress: result.toAddress || values.toAddress,
        fromAddress: result.fromAddress,
        inputData: result.inputData || '0x',
        blockNumber: result.blockNumber,
        status: result.status,
        gasUsed: result.gasUsed,
        onChainMemo: values.memo || '',
        id: result.txHash,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleString(),
        customData: { 
          memo: values.memo || '',
          memoIncludedOnChain: result.memoIncludedOnChain || false,
          isContract: result.isContract || false,
          // 添加与查询格式一致的完整交易详情
          messageType: 'ETH Transfer',
          value: result.amount,
          toAddress: result.toAddress || values.toAddress,
          fromAddress: result.fromAddress,
          transactionHash: result.txHash,
          blockNumber: result.blockNumber,
          onChainContent: values.memo || 'ETH Transfer',
          transactionTime: new Date().toLocaleString(),
          transactionFee: '计算中...',
          gasPrice: '计算中...',
          gasUsed: result.gasUsed || '0',
          gasLimit: '0'
        }
      };

      saveEthTransferRecord(ethRecord);

      const toAddress = result.toAddress || values.toAddress || '未知地址';
      message.success(`🎉 ETH转账成功！已发送到 ${toAddress.slice(0, 6)}...${toAddress.slice(-4)}` + (result.memoIncludedOnChain ? ' (备注已写入区块链)' : ''));
      ethTransferForm.resetFields();

      // 更新余额
      try {
        const newBalance = await ethTransferService.getBalance(account);
        setEthBalance(newBalance);
      } catch (error) {
        console.error('Failed to update balance:', error);
      }

    } catch (error) {
      console.error('ETH转账失败:', error);
      message.error('ETH转账失败: ' + error.message);
      updateProgress(-1, 'ETH转账失败: ' + error.message);
    } finally {
      setLoading(false);
      setTimeout(hideProgress, 2000);
    }
  };

  // USDT转账处理
  const handleUSDTTransfer = async (values) => {
    if (!account) {
      message.error('请先连接钱包');
      return;
    }

    setLoading(true);
    showProgress();
    
    try {
      updateProgress(5, '检查网络支持...');

      // 检查当前网络是否支持USDT
      const supportedNetwork = await usdtService.isCurrentNetworkSupported();
      if (!supportedNetwork) {
        throw new Error('当前网络不支持USDT转账，请切换到以太坊主网、BSC或Polygon网络');
      }

      updateProgress(10, '开始USDT转账...');

      const result = await usdtService.transferUSDT(
        values.toAddress,
        values.amount,
        supportedNetwork, // 使用检测到的支持网络
        updateProgress
      );

      // 保存交易记录
      saveUsdtTransferRecord({
        dataType: 'transfer',
        txHash: result.txHash,
        amount: result.amount,
        token: 'USDT',
        toAddress: result.toAddress || values.toAddress,
        fromAddress: account,
        inputData: result.inputData || result.transaction?.data || '0x',
        blockNumber: result.receipt?.blockNumber,
        status: result.receipt.status === 1 ? 'success' : 'failed',
        gasUsed: result.receipt.gasUsed.toString()
      });

      const toAddress = result.toAddress || values.toAddress || '未知地址';
      message.success(`🎉 USDT转账成功！已发送到 ${toAddress.slice(0, 6)}...${toAddress.slice(-4)}`);
      usdtTransferForm.resetFields();

      // 更新余额
      try {
        const newBalance = await safeGetUSDTBalance(account);
        setUsdtBalance(newBalance);
      } catch (error) {
        console.error('Failed to update USDT balance:', error);
      }

    } catch (error) {
      console.error('USDT转账失败:', error);
      message.error('USDT转账失败: ' + error.message);
      updateProgress(-1, 'USDT转账失败: ' + error.message);
    } finally {
      setLoading(false);
      setTimeout(hideProgress, 2000);
    }
  };

  // ETH转账表单组件
  const ETHTransferForm = () => {
    return (
      <Form
        form={ethTransferForm}
        layout="vertical"
        onFinish={handleETHTransfer}
        disabled={!account}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="接收地址"
              name="toAddress"
              rules={[
                { required: true, message: '请输入接收地址' },
                { 
                  validator: (_, value) => {
                    if (value && !ethTransferService.isValidAddress(value)) {
                      return Promise.reject(new Error('请输入有效的以太坊地址'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <Input 
                placeholder="0x..." 
                autoComplete="off"
                spellCheck={false}
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="转账金额 (ETH)"
              name="amount"
              rules={[
                { required: true, message: '请输入转账金额' },
                { type: 'number', min: 0.00001, message: '最小转账金额为0.00001 ETH' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0.00001"
                min={0.00001}
                step={0.00001}
                precision={6}
                autoComplete="off"
                controls={false}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="备注信息"
          name="memo"
          extra="备注信息将写入ETH转账的Input Data字段中。如果当前网络不支持Input Data，转账将会失败。请确保在支持的网络上操作，或清空备注后重试。"
        >
          <Input.TextArea
            placeholder="可选的转账备注信息"
            rows={2}
            autoComplete="off"
            spellCheck={false}
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            disabled={!account || loading}
            icon={<SendOutlined />}
          >
            {!account ? '请先连接钱包' : '发送ETH'}
          </Button>
        </Form.Item>
      </Form>
    );
  };

  // USDT转账表单组件
  const USDTTransferForm = () => {
    return (
      <Form
        form={usdtTransferForm}
        layout="vertical"
        onFinish={handleUSDTTransfer}
        disabled={!account}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="接收地址"
              name="toAddress"
              rules={[
                { required: true, message: '请输入接收地址' },
                { 
                  validator: (_, value) => {
                    if (value && !ethTransferService.isValidAddress(value)) {
                      return Promise.reject(new Error('请输入有效的以太坊地址'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <Input 
                placeholder="0x..." 
                autoComplete="off"
                spellCheck={false}
                style={{ fontFamily: 'monospace' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="转账金额 (USDT)"
              name="amount"
              rules={[
                { required: true, message: '请输入转账金额' },
                { type: 'number', min: 0.01, message: '最小转账金额为0.01 USDT' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="1.00"
                min={0.01}
                step={0.01}
                precision={2}
                autoComplete="off"
                controls={false}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            disabled={!account || loading}
            icon={<SendOutlined />}
          >
            {!account ? '请先连接钱包' : '发送USDT'}
          </Button>
        </Form.Item>
      </Form>
    );
  };

  // 日志上链处理
  const handleLogUpload = async (values) => {
    if (!account) {
      message.error('请先连接钱包');
      return;
    }

    setLoading(true);
    showProgress();
    
    try {
      updateProgress(5, '开始日志上链...');

      // 调用合约写入日志数据
      const result = await logChainService.uploadLogToChain(
        values.logData,
        values.logType || 'info',
        updateProgress
      );

      // 保存记录
      saveLogUploadRecord({
        dataType: 'log',
        txHash: result.txHash,
        logType: values.logType || 'info',
        logData: values.logData,
        logId: result.logId,
        contractAddress: result.contractAddress,
        inputData: result.inputData || '0x',
        blockNumber: result.blockNumber,
        status: result.status,
        gasUsed: result.gasUsed
      });

      const contractAddress = result.contractAddress || '未知合约';
      message.success(`🎉 日志上链成功！合约地址: ${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`);
      logUploadForm.resetFields();

      // 查询刚上链的数据并显示在链上数据记录中
      if (result.txHash && result.logId) {
        queryFreshChainData(result.txHash, result.logId);
      }

      // 获取最新交易记录
      fetchLatestOnChainTransactions(account);
    } catch (error) {
      console.error('日志上链失败:', error);
      message.error('日志上链失败: ' + error.message);
      updateProgress(-1, '日志上链失败: ' + error.message);
    } finally {
      setLoading(false);
      hideProgress();
    }
  };

  // 日志上链表单组件
  const LogUploadForm = () => {
    const [networkSupported, setNetworkSupported] = useState(null);

    // 检查网络支持状态
    useEffect(() => {
      const checkNetworkSupport = async () => {
        if (account && logChainService) {
          try {
            const supported = await logChainService.isNetworkSupported();
            setNetworkSupported(supported);
          } catch (error) {
            console.error('检查网络支持失败:', error);
            setNetworkSupported(false);
          }
        } else {
          setNetworkSupported(null);
        }
      };

      checkNetworkSupport();
    }, [account, network]);

    return (
      <Form
        form={logUploadForm}
        layout="vertical"
        onFinish={handleLogUpload}
        disabled={!account || !networkSupported}
      >
        {!account && (
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#fff7e6', border: '1px solid #ffd591', borderRadius: 6 }}>
            <Typography.Text type="warning">请先连接钱包以使用日志上链功能</Typography.Text>
          </div>
        )}
        
        {account && networkSupported === false && (
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 6 }}>
            <Typography.Text type="danger">当前网络暂不支持日志合约功能，请切换到支持的网络</Typography.Text>
          </div>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="日志类型"
              name="logType"
              initialValue="info"
              rules={[
                { required: true, message: '请选择日志类型' }
              ]}
            >
              <Select 
                placeholder="选择日志类型"
                options={[
                  { label: 'Info - 信息日志', value: 'info' },
                  { label: 'Warning - 警告日志', value: 'warning' },
                  { label: 'Error - 错误日志', value: 'error' },
                  { label: 'Debug - 调试日志', value: 'debug' }
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="时间戳"
            >
              <Input 
                placeholder="自动生成"
                disabled
                value={new Date().toLocaleString()}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="日志数据"
          name="logData"
          rules={[
            { required: true, message: '请输入要上链的日志数据' },
            { max: 1000, message: '日志数据不能超过1000字符' }
          ]}
        >
          <Input.TextArea
            rows={6}
            placeholder="请输入要写入区块链的日志数据..."
            autoComplete="off"
            spellCheck={false}
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            disabled={!account || loading || !networkSupported}
            icon={<FileTextOutlined />}
          >
            {!account ? '请先连接钱包' : (!networkSupported && networkSupported !== null) ? '网络不支持' : '写入区块链'}
          </Button>
        </Form.Item>
      </Form>
    );
  };

  // 交易记录表格列定义
  const transactionColumns = [
    {
      title: '交易哈希',
      dataIndex: 'txHash',
      key: 'txHash',
      render: (txHash, record) => {
        if (txHash) {
          return `${txHash.slice(0, 10)}...${txHash.slice(-8)}`;
        }
        return '-';
      }
    },
    {
      title: '交易金额',
      dataIndex: 'value',
      key: 'value',
      render: (value, record) => {
        // 优先显示 customData 中的 value，然后是记录本身的 value
        const transactionValue = record.customData?.value || record.value || '0';
        
        if (transactionValue && transactionValue !== '0') {
          return `${transactionValue} ETH`;
        }
        
        return '0 ETH';
      }
    },
    {
      title: '目标地址',
      dataIndex: 'toAddress',
      key: 'toAddress',
      render: (address, record) => {
        if (record.dataType === 'chaindata') {
          // 显示实际的toAddress，如果没有则显示合约地址
          const targetAddress = record.toAddress || record.contractAddress;
          if (targetAddress && targetAddress !== 'Chain Storage') {
            return `${targetAddress.slice(0, 10)}...${targetAddress.slice(-8)}`;
          }
          return <span style={{ color: '#722ed1' }}>区块链存储</span>;
        }
        return address ? `${address.slice(0, 10)}...${address.slice(-8)}` : '-';
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        if (record.customData?.source === 'thegraph') {
          return <Badge status="processing" text="链上数据" />;
        }
        return (
          <Badge 
            status={status === 'success' ? 'success' : 'error'} 
            text={status === 'success' ? '成功' : '失败'} 
          />
        );
      }
    },
    {
      title: '时间',
      dataIndex: 'date',
      key: 'date'
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedRecord(record);
            setViewModalVisible(true);
          }}
        >
          查看
        </Button>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ padding: '0 24px', background: '#001529' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
          <Title level={3} style={{ color: 'white', margin: 0 }}>
            <WalletOutlined /> Mask Truffle AI
          </Title>
          <WalletConnection onAccountChange={handleAccountChange} />
        </div>
      </Header>

      <Content style={{ padding: '24px', background: '#f0f2f5' }}>
        {/* 功能标签页 - 只包含操作功能 */}
        <Card style={{ marginBottom: 24 }}>
          <Tabs defaultActiveKey="eth-transfer" onChange={handleTabChange}>
            <TabPane tab={<span><SendOutlined />ETH 转账</span>} key="eth-transfer">
              <ETHTransferForm />
            </TabPane>

            <TabPane tab={<span><FileTextOutlined />日志上链</span>} key="log-upload">
              <LogUploadForm />
            </TabPane>
          </Tabs>
        </Card>

        {/* 记录展示区域 - 独立于标签页 */}
        <Row gutter={24}>
          {/* ETH转账记录 */}
          <Col span={24}>
            <Card 
              title={<span><SendOutlined /> ETH转账记录</span>}
              extra={
                <Badge 
                  count={filteredEthRecords.length} 
                  showZero 
                  style={{ backgroundColor: '#1890ff' }} 
                />
              }
            >
              <div style={{ marginBottom: 16 }}>
                <Input.Search
                  placeholder="输入交易哈希搜索ETH转账记录"
                  onSearch={searchETHTransferByHash}
                  enterButton="搜索交易"
                  loading={loading}
                  allowClear
                  style={{ width: '100%' }}
                />
              </div>
              <Table
                columns={transactionColumns}
                dataSource={filteredEthRecords}
                rowKey={(record) => record.id || record.txHash || Math.random()}
                pagination={{ pageSize: 10, size: 'small' }}
                scroll={{ x: 600 }}
                size="small"
              />
            </Card>
          </Col>
        </Row>

        {/* 链上数据记录 - 仅显示 The Graph 查询的真实链上数据 */}
        {graphHealthStatus && (
          <Row gutter={24} style={{ marginTop: 24 }}>
            <Col span={24}>
              <Card 
                title={<span><DatabaseOutlined /> 链上数据记录</span>}
                extra={
                  <Space>
                    <Badge 
                      count={filteredChainDataRecords.length} 
                      showZero 
                      style={{ backgroundColor: '#722ed1' }} 
                    />
                    {graphHealthStatus && (
                      <Button
                        size="small"
                        icon={<ReloadOutlined />}
                        loading={graphDataLoading}
                        onClick={refreshGraphData}
                        disabled={!graphDataEnabled}
                      >
                        刷新链上数据
                      </Button>
                    )}
                  </Space>
                }
              >
                {/* The Graph 数据控制区域 */}
                {graphHealthStatus && (
                  <div style={{ marginBottom: 16 }}>
                    <Alert
                      message={
                        <Space>
                          <CloudDownloadOutlined />
                          <span>The Graph 历史数据查询</span>
                          <Switch
                            size="small"
                            checked={graphDataEnabled}
                            onChange={handleGraphDataToggle}
                            loading={graphDataLoading}
                          />
                          {graphHealthStatus.status === 'healthy' && (
                            <Badge status="success" text="服务正常 - 点击开关查询历史数据" />
                          )}
                          {graphHealthStatus.status === 'not_supported' && (
                            <Badge status="warning" text="当前网络不支持" />
                          )}
                          {graphHealthStatus.status === 'error' && (
                            <Badge status="error" text="服务异常" />
                          )}
                        </Space>
                      }
                      type={graphHealthStatus.status === 'healthy' ? 'info' : 'warning'}
                      showIcon
                      style={{ marginBottom: 8 }}
                    />
                    {graphDataEnabled && graphRecords.length > 0 && (
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: 8 }}>
                        已加载 {graphRecords.length} 条 The Graph 数据记录
                      </div>
                    )}
                  </div>
                )}

                {/* 状态信息 */}
                <div style={{ fontSize: '12px', color: '#666', marginBottom: 16 }}>
                  <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
                    <span>The Graph 记录: {graphRecords.length} 条</span>
                    <span>总计: {filteredChainDataRecords.length} 条</span>
                  </Space>
                </div>
                
                {/* 搜索区域 */}
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={24}>
                    <Input.Search
                      placeholder="输入交易哈希搜索历史数据"
                      onSearch={searchByTransactionHash}
                      enterButton="搜索交易"
                      loading={graphDataLoading}
                      disabled={!theGraphService.isAvailable()}
                    />
                  </Col>
                </Row>
                
                <Table
                  columns={transactionColumns}
                  dataSource={filteredChainDataRecords}
                  rowKey={(record) => record.id || record.txHash || Math.random()}
                  pagination={{ pageSize: 10, size: 'small' }}
                  scroll={{ x: 600 }}
                  size="small"
                  loading={graphDataLoading}
                />
              </Card>
            </Col>
          </Row>
        )}

        {/* 详情查看Modal */}
        <Modal
          title="记录详情"
          open={viewModalVisible}
          onCancel={() => setViewModalVisible(false)}
          footer={null}
          width={800}
        >
          {selectedRecord && (
            <div>
              {/* ETH转账记录详情显示 */}
              {selectedRecord.dataType === 'transfer' && selectedRecord.customData && (
                <>
                  <Divider>ETH转账详情</Divider>
                  <Row gutter={16}>
                    <Col span={12}>
                      {selectedRecord.customData.messageType && (
                        <Paragraph><strong>消息类型:</strong> {selectedRecord.customData.messageType}</Paragraph>
                      )}
                      {selectedRecord.customData.value || selectedRecord.value && (
                        <Paragraph><strong>转账金额:</strong> {selectedRecord.customData.value || selectedRecord.value} ETH</Paragraph>
                      )}
                      {selectedRecord.customData.toAddress || selectedRecord.toAddress && (
                        <Paragraph><strong>目标地址:</strong> {selectedRecord.customData.toAddress || selectedRecord.toAddress}</Paragraph>
                      )}
                      {selectedRecord.customData.fromAddress || selectedRecord.fromAddress && (
                        <Paragraph><strong>来源地址:</strong> {selectedRecord.customData.fromAddress || selectedRecord.fromAddress}</Paragraph>
                      )}
                    </Col>
                    <Col span={12}>
                      {selectedRecord.date && (
                        <Paragraph><strong>交易时间:</strong> {selectedRecord.date}</Paragraph>
                      )}
                      {selectedRecord.customData.transactionFee && selectedRecord.customData.transactionFee !== '0 ETH' && (
                        <Paragraph><strong>交易费用:</strong> {selectedRecord.customData.transactionFee}</Paragraph>
                      )}
                      {selectedRecord.customData.gasPrice && selectedRecord.customData.gasPrice !== '0 Gwei' && (
                        <Paragraph><strong>Gas价格:</strong> {selectedRecord.customData.gasPrice}</Paragraph>
                      )}
                      {selectedRecord.customData.gasUsed && (
                        <Paragraph><strong>Gas使用量:</strong> {selectedRecord.customData.gasUsed}</Paragraph>
                      )}
                      {selectedRecord.customData.gasLimit && (
                        <Paragraph><strong>Gas限制:</strong> {selectedRecord.customData.gasLimit}</Paragraph>
                      )}
                    </Col>
                  </Row>

                  {/* 交易哈希和区块号 */}
                  <Paragraph><strong>交易哈希:</strong> {selectedRecord.customData.transactionHash || selectedRecord.txHash}</Paragraph>
                  <Paragraph><strong>区块号:</strong> {selectedRecord.customData.blockNumber || selectedRecord.blockNumber}</Paragraph>

                  {/* 链上内容 */}
                  {selectedRecord.customData.onChainContent && (
                    <Paragraph>
                      <strong>链上内容:</strong>
                      <br />
                      {selectedRecord.customData.onChainContent}
                    </Paragraph>
                  )}

                  {/* Input Data */}
                  {selectedRecord.inputData && selectedRecord.inputData !== '0x' && (
                    <Paragraph>
                      <strong>Input Data:</strong>
                      <br />
                      {selectedRecord.inputData}
                    </Paragraph>
                  )}
                </>
              )}

              {/* 链上数据特殊显示 */}
              {selectedRecord.dataType === 'chaindata' && selectedRecord.customData && (
                <>
                  <Divider>链上数据信息</Divider>
                  <Row gutter={16}>
                    <Col span={12}>
                      {selectedRecord.customData.messageType && (
                        <Paragraph><strong>消息类型:</strong> {selectedRecord.customData.messageType}</Paragraph>
                      )}
                      {selectedRecord.customData.value && (
                        <Paragraph><strong>转账金额:</strong> {selectedRecord.customData.value} ETH</Paragraph>
                      )}
                      {selectedRecord.customData.toAddress && (
                        <Paragraph><strong>目标地址:</strong> {selectedRecord.customData.toAddress}</Paragraph>
                      )}
                      {selectedRecord.customData.fromAddress && (
                        <Paragraph><strong>来源地址:</strong> {selectedRecord.customData.fromAddress}</Paragraph>
                      )}
                      {selectedRecord.customData.contractAddress && (
                        <Paragraph><strong>合约地址:</strong> {selectedRecord.customData.contractAddress}</Paragraph>
                      )}
                    </Col>
                    <Col span={12}>
                      {selectedRecord.customData.transactionTime && (
                        <Paragraph><strong>交易时间:</strong> {selectedRecord.customData.transactionTime}</Paragraph>
                      )}
                      {selectedRecord.customData.transactionFee && selectedRecord.customData.transactionFee !== '0' && (
                        <Paragraph><strong>交易费用:</strong> {selectedRecord.customData.transactionFee} ETH</Paragraph>
                      )}
                      {selectedRecord.customData.gasPrice && selectedRecord.customData.gasPrice !== '0' && (
                        <Paragraph><strong>Gas价格:</strong> {selectedRecord.customData.gasPrice}</Paragraph>
                      )}
                      {selectedRecord.customData.gasUsed && (
                        <Paragraph><strong>Gas使用量:</strong> {selectedRecord.customData.gasUsed}</Paragraph>
                      )}
                      {selectedRecord.customData.gasLimit && (
                        <Paragraph><strong>Gas限制:</strong> {selectedRecord.customData.gasLimit}</Paragraph>
                      )}
                    </Col>
                  </Row>

                  {/* 交易哈希和区块号 */}
                  <Paragraph><strong>交易哈希:</strong> {selectedRecord.customData.transactionHash || selectedRecord.txHash}</Paragraph>
                  <Paragraph><strong>区块号:</strong> {selectedRecord.customData.blockNumber || selectedRecord.blockNumber}</Paragraph>

                  {/* 链上内容 */}
                  {selectedRecord.customData.onChainContent && (
                    <Paragraph>
                      <strong>链上内容:</strong>
                      <br />
                      {selectedRecord.customData.onChainContent}
                    </Paragraph>
                  )}

                  {/* Input Data */}
                  {selectedRecord.customData.inputData && selectedRecord.customData.inputData !== '0x' && (
                    <Paragraph>
                      <strong>Input Data:</strong>
                      <br />
                      {selectedRecord.customData.inputData}
                    </Paragraph>
                  )}
                </>
              )}
            </div>
          )}
        </Modal>
      </Content>

      <Footer style={{ textAlign: 'center', background: '#f0f2f5' }}>
        <Text type="secondary">
          Mask Truffle AI ©2024 - 去中心化数据存储与转账平台
        </Text>
      </Footer>

      {/* 进度条模态框 */}
      <ProgressBar
        visible={progressVisible}
        progress={progressPercent}
        status={progressStatus}
        message={progressMessage}
        onCancel={hideProgress}
      />
    </Layout>
  );
}

// 主应用组件，包装 Web3ReactProvider
function App() {
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <AppContent />
    </Web3ReactProvider>
  );
}

export default App;