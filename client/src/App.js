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
  const [transactionRecords, setTransactionRecords] = useState([]);
  const [activeTab, setActiveTab] = useState('eth-transfer'); // 新增：追踪当前活动标签
  const [searchText, setSearchText] = useState(''); // 新增：搜索文本
  
  // The Graph 相关状态
  const [graphDataEnabled, setGraphDataEnabled] = useState(false);
  const [graphDataLoading, setGraphDataLoading] = useState(false);
  const [graphRecords, setGraphRecords] = useState([]);
  const [graphHealthStatus, setGraphHealthStatus] = useState(null);
  
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

        // 获取当前钱包最新的2条链上交易记录
        fetchLatestOnChainTransactions(walletAccount);

      } else {
        // 钱包断开连接
        setAccount(null);
        setEthBalance('0');
        setUsdtBalance('0');
        setNetwork(null);
        setTransactionRecords([]);
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
          setGraphDataEnabled(true);
          // 如果有用户账户，自动加载数据
          if (account) {
            await loadGraphData();
          }
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

  // 从The Graph加载数据
  const loadGraphData = async () => {
    if (!graphDataEnabled || !account) return;

    setGraphDataLoading(true);
    try {
      // 获取用户的链上数据
      const userData = await theGraphService.getDataByCreator(account, 50);
      console.log('Loaded Graph data:', userData);
      
      // 转换为应用内的记录格式
      const formattedRecords = userData.map(data => ({
        id: data.id,
        dataType: 'chaindata',
        token: data.dataType || 'DATA',
        amount: `Log ${data.logId}`,
        toAddress: 'Chain Storage',
        fromAddress: data.creator,
        txHash: data.txHash,
        blockNumber: data.blockNumber,
        status: 'success',
        date: data.date,
        timestamp: data.timestamp,
        onChainMemo: data.content,
        customData: {
          logId: data.logId,
          dataType: data.dataType,
          content: data.content,
          dataHash: data.dataHash,
          source: 'thegraph'
        }
      }));

      setGraphRecords(formattedRecords);
    } catch (error) {
      console.error('Failed to load Graph data:', error);
      message.error('加载链上数据失败: ' + error.message);
    } finally {
      setGraphDataLoading(false);
    }
  };

  // 刷新The Graph数据
  const refreshGraphData = async () => {
    await loadGraphData();
    message.success('链上数据已刷新');
  };

  // 切换The Graph数据显示
  const handleGraphDataToggle = async (enabled) => {
    setGraphDataEnabled(enabled);
    if (enabled && account) {
      await loadGraphData();
    } else {
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

  // 保存交易记录（仅保存到状态）
  const saveTransactionRecord = (record) => {
    console.log('保存新的交易记录:', record);
    const newRecord = {
      ...record,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleString()
    };
    const updatedRecords = [newRecord, ...transactionRecords];
    console.log('更新后的记录总数:', updatedRecords.length);
    setTransactionRecords(updatedRecords);
  };

  // 从链上获取当前钱包最新的2条交易记录
  const fetchLatestOnChainTransactions = async (walletAddress) => {
    if (!walletAddress) {
      console.log('没有钱包地址，跳过链上交易获取');
      return;
    }

    try {
      console.log('开始获取钱包最新交易记录:', walletAddress);
      
      // 获取最新的链上交易记录
      const latestTransactions = await ethTransferService.getLatestTransactions(walletAddress, 2);
      
      if (latestTransactions && latestTransactions.length > 0) {
        console.log(`获取到 ${latestTransactions.length} 条最新交易记录`);
        
        // 转换为应用内的记录格式
        const formattedRecords = latestTransactions.map(tx => ({
          dataType: 'transfer',
          txHash: tx.hash,
          amount: tx.value,
          token: tx.token || 'ETH',
          toAddress: tx.to,
          fromAddress: tx.from,
          inputData: tx.inputData || '0x',
          blockNumber: tx.blockNumber,
          status: tx.status === 1 ? 'success' : 'failed',
          gasUsed: tx.gasUsed?.toString(),
          onChainMemo: tx.memo,
          id: tx.hash,
          timestamp: new Date(tx.timestamp * 1000).toISOString(),
          date: new Date(tx.timestamp * 1000).toLocaleString()
        }));

        setTransactionRecords(formattedRecords);
        console.log('链上交易记录已更新到状态中');
      } else {
        console.log('没有找到最新的交易记录');
      }
    } catch (error) {
      console.error('获取链上交易记录失败:', error);
    }
  };

  // 初始化时不加载本地缓存数据
  const loadTransactionRecords = async () => {
    console.log('初始化交易记录状态（不从本地缓存加载）');
    setTransactionRecords([]);
  };

  // 过滤交易记录 - 合并本地记录和The Graph数据
  const filteredTransactionRecords = React.useMemo(() => {
    // 合并本地记录和Graph记录
    const allRecords = [...transactionRecords];
    if (graphDataEnabled) {
      allRecords.push(...graphRecords);
    }
    
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
        record.onChainMemo?.toLowerCase().includes(searchLower) ||
        record.customData?.content?.toLowerCase().includes(searchLower) ||
        record.customData?.dataType?.toLowerCase().includes(searchLower)
      );
    });
  }, [transactionRecords, graphRecords, searchText, graphDataEnabled]);

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

      // 保存交易记录
      saveTransactionRecord({
        dataType: 'transfer',
        txHash: result.txHash,
        amount: result.amount,
        token: 'ETH',
        toAddress: result.toAddress,
        fromAddress: result.fromAddress,
        inputData: result.inputData || '0x',
        blockNumber: result.blockNumber,
        customData: { 
          memo: values.memo || '',
          memoIncludedOnChain: result.memoIncludedOnChain || false,
          isContract: result.isContract || false
        },
        status: result.status,
        gasUsed: result.gasUsed
      });

      message.success(`🎉 ETH转账成功！已发送到 ${result.toAddress.slice(0, 6)}...${result.toAddress.slice(-4)}` + (result.memoIncludedOnChain ? ' (备注已写入区块链)' : ''));
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
      saveTransactionRecord({
        dataType: 'transfer',
        txHash: result.txHash,
        amount: result.amount,
        token: 'USDT',
        toAddress: result.toAddress,
        fromAddress: account,
        inputData: result.inputData || result.transaction?.data || '0x',
        blockNumber: result.receipt?.blockNumber,
        status: result.receipt.status === 1 ? 'success' : 'failed',
        gasUsed: result.receipt.gasUsed.toString()
      });

      message.success(`🎉 USDT转账成功！已发送到 ${result.toAddress.slice(0, 6)}...${result.toAddress.slice(-4)}`);
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
                { type: 'number', min: 0.001, message: '最小转账金额为0.001 ETH' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="0.001"
                min={0.001}
                step={0.001}
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
      saveTransactionRecord({
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

      message.success(`🎉 日志上链成功！合约地址: ${result.contractAddress.slice(0, 6)}...${result.contractAddress.slice(-4)}`);
      logUploadForm.resetFields();

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
      title: '类型',
      dataIndex: 'token',
      key: 'token',
      render: (token, record) => {
        let color = 'blue';
        let text = token;
        
        if (record.dataType === 'chaindata') {
          color = 'purple';
          text = record.customData?.dataType || 'DATA';
        } else if (token === 'ETH') {
          color = 'blue';
        } else if (token === 'USDT') {
          color = 'green';
        }
        
        return <Badge color={color} text={text} />;
      }
    },
    {
      title: '金额/数据',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => {
        if (record.dataType === 'chaindata') {
          return <span style={{ color: '#722ed1' }}>链上数据 #{record.customData?.logId}</span>;
        }
        return `${amount} ${record.token}`;
      }
    },
    {
      title: '目标地址',
      dataIndex: 'toAddress',
      key: 'toAddress',
      render: (address, record) => {
        if (record.dataType === 'chaindata') {
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

            <TabPane tab={<span><SendOutlined />USDT 转账</span>} key="usdt-transfer">
              <USDTTransferForm />
            </TabPane>

            <TabPane tab={<span><FileTextOutlined />日志上链</span>} key="log-upload">
              <LogUploadForm />
            </TabPane>
          </Tabs>
        </Card>

        {/* 记录展示区域 - 独立于标签页 */}
        <Row gutter={24}>
          <Col span={24}>
            <Card 
              title={<span><HistoryOutlined /> 转账记录</span>}
              extra={
                <Space>
                  <Badge 
                    count={filteredTransactionRecords.length} 
                    showZero 
                    style={{ backgroundColor: '#52c41a' }} 
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
                        <span>The Graph 数据读取</span>
                        <Switch
                          size="small"
                          checked={graphDataEnabled}
                          onChange={handleGraphDataToggle}
                          loading={graphDataLoading}
                        />
                        {graphHealthStatus.status === 'healthy' && (
                          <Badge status="success" text="服务正常" />
                        )}
                        {graphHealthStatus.status === 'not_supported' && (
                          <Badge status="warning" text="当前网络不支持" />
                        )}
                        {graphHealthStatus.status === 'error' && (
                          <Badge status="error" text="服务异常" />
                        )}
                      </Space>
                    }
                    type={graphHealthStatus.status === 'healthy' ? 'success' : 'warning'}
                    showIcon
                    style={{ marginBottom: 8 }}
                  />
                  {graphDataEnabled && graphRecords.length > 0 && (
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: 8 }}>
                      已加载 {graphRecords.length} 条链上数据记录
                    </div>
                  )}
                </div>
              )}
              
              <div style={{ marginBottom: 16 }}>
                <Input.Search
                  placeholder="搜索交易记录（地址、哈希、金额、状态、链上数据等）"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onSearch={(value) => setSearchText(value)}
                  allowClear
                  style={{ width: '100%' }}
                />
              </div>
              <Table
                columns={transactionColumns}
                dataSource={filteredTransactionRecords}
                rowKey={(record) => record.id || record.txHash || Math.random()}
                pagination={{ pageSize: 10, size: 'small' }}
                scroll={{ x: 600 }}
                size="small"
                loading={graphDataLoading}
              />
            </Card>
          </Col>
        </Row>

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
              <Divider>基本信息</Divider>
              <Row gutter={16}>
                <Col span={12}>
                  <Paragraph><strong>类型:</strong> {selectedRecord.token || selectedRecord.dataType}</Paragraph>
                  <Paragraph><strong>状态:</strong> 
                    <Badge 
                      status={selectedRecord.status === 'success' ? 'success' : 'error'} 
                      text={selectedRecord.status === 'success' ? '成功' : '失败'} 
                    />
                  </Paragraph>
                  <Paragraph><strong>时间:</strong> {selectedRecord.date}</Paragraph>
                </Col>
                <Col span={12}>
                  {selectedRecord.amount && (
                    <Paragraph><strong>金额:</strong> {selectedRecord.amount} {selectedRecord.token}</Paragraph>
                  )}
                  {selectedRecord.toAddress && (
                    <Paragraph><strong>接收地址:</strong> {selectedRecord.toAddress}</Paragraph>
                  )}
                  {selectedRecord.fromAddress && (
                    <Paragraph><strong>发送地址:</strong> {selectedRecord.fromAddress}</Paragraph>
                  )}
                </Col>
              </Row>

              <Divider>交易信息</Divider>
              <Paragraph><strong>交易哈希:</strong> {selectedRecord.txHash}</Paragraph>
              {selectedRecord.blockNumber && (
                <Paragraph><strong>区块号:</strong> {selectedRecord.blockNumber}</Paragraph>
              )}
              {selectedRecord.gasUsed && (
                <Paragraph><strong>Gas使用量:</strong> {selectedRecord.gasUsed}</Paragraph>
              )}
              {selectedRecord.dataType === 'transfer' && (
                <Paragraph>
                  <strong>Input Data:</strong>
                  <br />
                  <Text code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '12px' }}>
                    {selectedRecord.inputData || '0x'}
                  </Text>
                </Paragraph>
              )}
              {/* 仅在非转账记录时显示合约信息 */}
              {selectedRecord.dataType !== 'transfer' && selectedRecord.id && (
                <Paragraph><strong>合约记录ID:</strong> #{selectedRecord.id}</Paragraph>
              )}
              {selectedRecord.dataType !== 'transfer' && selectedRecord.creator && (
                <Paragraph><strong>创建者地址:</strong> {selectedRecord.creator}</Paragraph>
              )}
              {selectedRecord.dataType !== 'transfer' && selectedRecord.isActive !== undefined && (
                <Paragraph>
                  <strong>记录状态:</strong> 
                  <Badge 
                    status={selectedRecord.isActive ? 'success' : 'error'} 
                    text={selectedRecord.isActive ? '活跃' : '已停用'} 
                    style={{ marginLeft: 8 }}
                  />
                </Paragraph>
              )}

              {/* 链上数据特殊显示 */}
              {selectedRecord.dataType === 'chaindata' && selectedRecord.customData && (
                <>
                  <Divider>链上数据信息</Divider>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Paragraph><strong>数据ID:</strong> #{selectedRecord.customData.logId}</Paragraph>
                      <Paragraph><strong>数据类型:</strong> {selectedRecord.customData.dataType}</Paragraph>
                      <Paragraph><strong>数据哈希:</strong> 
                        <Text code style={{ fontSize: '11px', wordBreak: 'break-all' }}>
                          {selectedRecord.customData.dataHash}
                        </Text>
                      </Paragraph>
                    </Col>
                    <Col span={12}>
                      <Paragraph><strong>创建者:</strong> {selectedRecord.customData?.creator || selectedRecord.fromAddress}</Paragraph>
                      <Paragraph><strong>数据源:</strong> 
                        <Badge status="processing" text="The Graph" style={{ marginLeft: 8 }} />
                      </Paragraph>
                    </Col>
                  </Row>
                  <Paragraph>
                    <strong>链上数据内容:</strong>
                    <br />
                    <Text code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '12px' }}>
                      {selectedRecord.customData.content}
                    </Text>
                  </Paragraph>
                </>
              )}
              
              {/* 转账记录只显示链上备注，不显示本地备注 */}
              {selectedRecord.dataType === 'transfer' && selectedRecord.onChainMemo && (
                <>
                  <Divider>链上信息</Divider>
                  <Paragraph>
                    <strong>链上备注:</strong> {selectedRecord.onChainMemo}
                    <Badge status="success" text="从链上读取" style={{ marginLeft: 8 }} />
                  </Paragraph>
                </>
              )}
              
              {/* 非转账记录显示完整备注信息 */}
              {selectedRecord.dataType !== 'transfer' && selectedRecord.customData && typeof selectedRecord.customData === 'object' && (
                <>
                  <Divider>备注信息</Divider>
                  {selectedRecord.customData.memo && (
                    <Paragraph>
                      <strong>本地备注:</strong> {selectedRecord.customData.memo}
                      {selectedRecord.customData.memoIncludedOnChain ? (
                        <Badge status="success" text="已写入区块链" style={{ marginLeft: 8 }} />
                      ) : (
                        <Badge status="warning" text="仅本地存储" style={{ marginLeft: 8 }} />
                      )}
                    </Paragraph>
                  )}
                  {selectedRecord.onChainMemo && (
                    <Paragraph>
                      <strong>链上备注:</strong> {selectedRecord.onChainMemo}
                      <Badge status="success" text="从链上读取" style={{ marginLeft: 8 }} />
                    </Paragraph>
                  )}
                  {selectedRecord.customData.onChainMemo && selectedRecord.customData.onChainMemo !== selectedRecord.onChainMemo && (
                    <Paragraph>
                      <strong>存储的链上备注:</strong> {selectedRecord.customData.onChainMemo}
                      <Badge status="success" text="链上数据" style={{ marginLeft: 8 }} />
                    </Paragraph>
                  )}
                  {!selectedRecord.customData.memo && !selectedRecord.onChainMemo && !selectedRecord.customData.onChainMemo && (
                    <Paragraph>
                      <Text type="secondary">该交易无备注信息</Text>
                    </Paragraph>
                  )}
                  {selectedRecord.customData.isContract !== undefined && (
                    <Paragraph><strong>目标类型:</strong> {selectedRecord.customData.isContract ? '智能合约' : '普通地址'}</Paragraph>
                  )}
                </>
              )}

              {/* 非转账记录的存储数据 */}
              {selectedRecord.dataType !== 'transfer' && selectedRecord.customData && typeof selectedRecord.customData === 'string' && (
                <>
                  <Divider>存储的数据</Divider>
                  <Paragraph>
                    <Text code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {selectedRecord.customData}
                    </Text>
                  </Paragraph>
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