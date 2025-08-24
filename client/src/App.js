import React, { useState, useEffect } from 'react';
import { Web3ReactProvider } from '@web3-react/core';
import { Web3Provider } from '@ethersproject/providers';
import { Layout, Card, Input, Button, Select, Table, Space, Modal, Form, message, Tag, Statistic, Row, Col, Tabs, Alert } from 'antd';
import { SearchOutlined, PlusOutlined, WalletOutlined, DatabaseOutlined, LeftOutlined, SendOutlined, FileTextOutlined, TransactionOutlined, InfoCircleOutlined } from '@ant-design/icons';
import WalletConnection from './components/WalletConnection';
import ProgressBar from './components/ProgressBar';
import DataStorageService from './services/DataStorageService';
import USDTService from './services/USDTService';
import './App.css';

const { Header, Content } = Layout;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

function getLibrary(provider) {
  const library = new Web3Provider(provider);
  library.pollingInterval = 12000;
  return library;
}

function App() {
  const [activeTab, setActiveTab] = useState('transfer');
  const [searchValue, setSearchValue] = useState('');
  const [dataRecords, setDataRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [stats, setStats] = useState({ total: 0, active: 0, totalTypes: 0 });
  const [account, setAccount] = useState('');
  const [dataService, setDataService] = useState(null);
  const [usdtService, setUsdtService] = useState(null);

  // 进度条相关状态
  const [progressVisible, setProgressVisible] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [progressStatus, setProgressStatus] = useState('active'); // 'active', 'success', 'exception'
  const [progressMessage, setProgressMessage] = useState('');

  // 表单数据状态
  const [transferForm] = Form.useForm();
  const [logForm] = Form.useForm();
  const [usdtForm] = Form.useForm();

  // USDT相关状态
  const [usdtBalance, setUsdtBalance] = useState('0');
  const [currentNetwork, setCurrentNetwork] = useState('ethereum');

  useEffect(() => {
    if (account) {
      const logService = new DataStorageService();
      const tokenService = new USDTService();
      
      setDataService(logService);
      setUsdtService(tokenService);
      
      // 根据当前tab加载对应数据
      if (activeTab === 'log') {
        loadInitialData(logService);
        loadStats(logService);
      } else {
        loadTransferHistory();
      }

      // 如果在USDT tab，加载USDT余额
      if (activeTab === 'usdt') {
        loadUSDTBalance(tokenService);
      }
    }
  }, [account, activeTab]);

  const loadInitialData = async (service) => {
    setLoading(true);
    try {
      const records = await service.getActiveRecords(0, 10);
      setDataRecords(records);
    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('加载合约数据失败，请检查合约地址和网络连接');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (service) => {
    try {
      const statsData = await service.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('加载统计数据失败:', error);
      // 对于合约调用失败，使用默认值
      setStats({ total: 0, active: 0, totalTypes: 0 });
    }
  };

  const loadTransferHistory = () => {
    // 从localStorage加载转账历史记录
    try {
      const history = localStorage.getItem('transferHistory');
      if (history) {
        const records = JSON.parse(history);
        setDataRecords(records.slice(0, 10)); // 显示最近10条
        setStats({ 
          total: records.length, 
          active: records.filter(r => r.status === 'success').length, 
          totalTypes: 3 
        });
      } else {
        setDataRecords([]);
        setStats({ total: 0, active: 0, totalTypes: 0 });
      }
    } catch (error) {
      console.error('加载转账历史失败:', error);
      setDataRecords([]);
      setStats({ total: 0, active: 0, totalTypes: 0 });
    }
  };

  const loadUSDTBalance = async (service) => {
    try {
      if (account && service) {
        const supportedNetwork = await service.isCurrentNetworkSupported();
        if (supportedNetwork) {
          setCurrentNetwork(supportedNetwork);
          const balance = await service.getUSDTBalance(account, supportedNetwork);
          setUsdtBalance(balance);
        } else {
          setUsdtBalance('0');
          message.warning('当前网络不支持USDT，请切换到以太坊主网');
        }
      }
    } catch (error) {
      console.error('加载USDT余额失败:', error);
      setUsdtBalance('0');
    }
  };

  const handleSearch = async () => {
    if (!account) {
      message.warning('请先连接钱包');
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'log' && dataService) {
        const records = await dataService.getActiveRecords(0, 50);
        setDataRecords(records.filter(record => record && record.isActive));
      } else {
        loadTransferHistory();
      }
    } catch (error) {
      console.error('搜索失败:', error);
      message.error('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  // 进度更新回调函数
  const handleProgressUpdate = (progress, message, status = 'active') => {
    if (progress === -1) {
      // 错误状态
      setProgressStatus('exception');
      setProgressMessage(message);
    } else {
      setProgressValue(progress);
      setProgressMessage(message);
      
      if (progress >= 100) {
        setProgressStatus('success');
        // 成功后2秒自动关闭
        setTimeout(() => {
          setProgressVisible(false);
        }, 2000);
      } else {
        setProgressStatus('active');
      }
    }
  };

  // 直接钱包ETH转账功能
  const handleETHTransfer = async (values) => {
    if (!window.ethereum || !account) {
      message.error('请先连接钱包');
      return;
    }

    // 显示进度条
    setProgressVisible(true);
    setProgressValue(0);
    setProgressStatus('active');
    setProgressMessage('正在准备ETH转账...');

    try {
      const { ethers } = require('ethers');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // 进度更新
      handleProgressUpdate(20, '正在获取钱包签名器...');

      // 准备交易数据
      const txData = {
        to: values.toAddress,
        value: ethers.utils.parseEther(values.amount.toString()),
        gasPrice: values.gasPrice ? ethers.utils.parseUnits(values.gasPrice.toString(), 'gwei') : undefined
      };

      handleProgressUpdate(40, '正在估算Gas费用...');

      // 估算gas
      const gasEstimate = await signer.estimateGas(txData);
      txData.gasLimit = gasEstimate.mul(120).div(100); // 增加20%缓冲

      handleProgressUpdate(60, '正在发送ETH转账交易...');

      // 发送交易
      const tx = await signer.sendTransaction(txData);
      
      handleProgressUpdate(80, '等待交易确认...');

      // 等待确认
      const receipt = await tx.wait();

      handleProgressUpdate(100, 'ETH转账成功！');

      // 保存转账记录
      const transferRecord = {
        id: Date.now(),
        dataType: 'transfer',
        fromAddress: account,
        toAddress: values.toAddress,
        amount: values.amount,
        token: 'ETH',
        txHash: tx.hash,
        timestamp: new Date().toISOString(),
        status: 'success',
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber
      };

      // 更新localStorage
      const history = JSON.parse(localStorage.getItem('transferHistory') || '[]');
      history.unshift(transferRecord);
      localStorage.setItem('transferHistory', JSON.stringify(history.slice(0, 100)));

      message.success('ETH转账成功！');
      transferForm.resetFields();
      loadTransferHistory();

    } catch (error) {
      console.error('ETH转账失败:', error);
      handleProgressUpdate(-1, `ETH转账失败: ${error.message}`);
      message.error('ETH转账失败: ' + error.message);
    }
  };

  // USDT转账功能
  const handleUSDTTransfer = async (values) => {
    if (!usdtService || !account) {
      message.error('请先连接钱包');
      return;
    }

    // 显示进度条
    setProgressVisible(true);
    setProgressValue(0);
    setProgressStatus('active');
    setProgressMessage('正在准备USDT转账...');

    try {
      const result = await usdtService.transferUSDT(
        values.toAddress,
        values.amount,
        currentNetwork,
        handleProgressUpdate
      );

      // 保存USDT转账记录
      const transferRecord = {
        id: Date.now(),
        dataType: 'usdt',
        fromAddress: account,
        toAddress: values.toAddress,
        amount: values.amount,
        token: 'USDT',
        txHash: result.txHash,
        timestamp: new Date().toISOString(),
        status: 'success',
        network: currentNetwork
      };

      // 更新localStorage
      const history = JSON.parse(localStorage.getItem('transferHistory') || '[]');
      history.unshift(transferRecord);
      localStorage.setItem('transferHistory', JSON.stringify(history.slice(0, 100)));

      message.success('USDT转账成功！');
      usdtForm.resetFields();
      loadTransferHistory();
      
      // 刷新USDT余额
      loadUSDTBalance(usdtService);

    } catch (error) {
      console.error('USDT转账失败:', error);
      message.error('USDT转账失败: ' + error.message);
    }
  };

  // 日志数据上链（使用合约）
  const handleLogSubmit = async (values) => {
    if (!dataService) {
      message.warning('请先连接钱包');
      return;
    }

    // 显示进度条
    setProgressVisible(true);
    setProgressValue(0);
    setProgressStatus('active');
    setProgressMessage('正在准备日志数据...');

    try {
      const content = JSON.stringify({
        logLevel: values.logLevel,
        message: values.message,
        source: values.source,
        timestamp: new Date().toISOString()
      });

      // 调用合约存储日志
      await dataService.storeData('log', content, handleProgressUpdate);
      
      message.success('日志数据上链成功');
      logForm.resetFields();
      
      // 刷新合约数据
      await loadInitialData(dataService);
      await loadStats(dataService);

    } catch (error) {
      console.error('日志上链失败:', error);
      handleProgressUpdate(-1, `上链失败: ${error.message}`);
      message.error('日志数据上链失败: ' + error.message);
    }
  };

  const handleSubmit = async (values, type) => {
    if (type === 'log') {
      await handleLogSubmit(values);
    } else if (type === 'transfer') {
      await handleETHTransfer(values);
    } else if (type === 'usdt') {
      await handleUSDTTransfer(values);
    }
  };

  const getTabName = (type) => {
    switch (type) {
      case 'transfer': return 'ETH转账';
      case 'log': return '日志';
      case 'usdt': return 'USDT转账';
      default: return '';
    }
  };

  // 关闭进度条
  const handleProgressClose = () => {
    setProgressVisible(false);
    setProgressValue(0);
    setProgressStatus('active');
    setProgressMessage('');
  };

  const renderTransferForm = () => (
    <Form
      form={transferForm}
      layout="vertical"
      onFinish={(values) => handleSubmit(values, 'transfer')}
      className="data-form"
    >
      <Alert
        message="直接钱包转账"
        description="这将直接使用您的钱包发送ETH，不会存储到区块链合约中"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            label="接收地址"
            name="toAddress"
            rules={[{ required: true, message: '请输入接收地址' }]}
          >
            <Input placeholder="0x..." />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="转账金额 (ETH)"
            name="amount"
            rules={[{ required: true, message: '请输入转账金额' }]}
          >
            <Input type="number" placeholder="0.0" step="0.000001" />
          </Form.Item>
        </Col>
      </Row>
      
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            label="Gas价格 (Gwei)"
            name="gasPrice"
            tooltip="留空将自动设置合适的Gas价格"
          >
            <Input type="number" placeholder="自动设置" />
          </Form.Item>
        </Col>
      </Row>
      
      <Form.Item>
        <Space>
          <Button 
            type="primary" 
            htmlType="submit" 
            icon={<TransactionOutlined />} 
            size="large"
            loading={progressVisible && progressStatus === 'active'}
            disabled={progressVisible && progressStatus === 'active'}
          >
            立即转账
          </Button>
          <Button 
            onClick={() => transferForm.resetFields()} 
            size="large"
            disabled={progressVisible && progressStatus === 'active'}
          >
            重置
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );

  const renderLogForm = () => (
    <Form
      form={logForm}
      layout="vertical"
      onFinish={(values) => handleSubmit(values, 'log')}
      className="data-form"
    >
      <Alert
        message="区块链日志存储"
        description="日志数据将永久存储在区块链合约中，无法删除或修改"
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item
            label="日志级别"
            name="logLevel"
            rules={[{ required: true, message: '请选择日志级别' }]}
            initialValue="INFO"
          >
            <Select>
              <Option value="DEBUG">DEBUG</Option>
              <Option value="INFO">INFO</Option>
              <Option value="WARN">WARN</Option>
              <Option value="ERROR">ERROR</Option>
              <Option value="FATAL">FATAL</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} md={16}>
          <Form.Item
            label="日志来源"
            name="source"
            rules={[{ required: true, message: '请输入日志来源' }]}
          >
            <Input placeholder="例如: UserService, PaymentProcessor, etc." />
          </Form.Item>
        </Col>
      </Row>
      
      <Form.Item
        label="日志消息"
        name="message"
        rules={[{ required: true, message: '请输入日志消息' }]}
      >
        <TextArea rows={6} placeholder="输入详细的日志信息..." />
      </Form.Item>
      
      <Form.Item>
        <Space>
          <Button 
            type="primary" 
            htmlType="submit" 
            icon={<FileTextOutlined />} 
            size="large"
            loading={progressVisible && progressStatus === 'active'}
            disabled={progressVisible && progressStatus === 'active'}
          >
            提交到区块链
          </Button>
          <Button 
            onClick={() => logForm.resetFields()} 
            size="large"
            disabled={progressVisible && progressStatus === 'active'}
          >
            重置
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );

  const renderUsdtForm = () => (
    <Form
      form={usdtForm}
      layout="vertical"
      onFinish={(values) => handleSubmit(values, 'usdt')}
      className="data-form"
    >
      <Alert
        message={`USDT代币转账 - 当前余额: ${usdtBalance} USDT`}
        description={`网络: ${currentNetwork === 'ethereum' ? 'Ethereum 主网' : currentNetwork}`}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            label="接收地址"
            name="toAddress"
            rules={[{ required: true, message: '请输入接收地址' }]}
          >
            <Input placeholder="0x..." />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="USDT金额"
            name="amount"
            rules={[{ required: true, message: '请输入USDT金额' }]}
          >
            <Input 
              type="number" 
              placeholder="0.00" 
              step="0.01"
              addonAfter={
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => usdtForm.setFieldsValue({ amount: usdtBalance })}
                >
                  全部
                </Button>
              }
            />
          </Form.Item>
        </Col>
      </Row>
      
      <Form.Item>
        <Space>
          <Button 
            type="primary" 
            htmlType="submit" 
            icon={<SendOutlined />} 
            size="large"
            loading={progressVisible && progressStatus === 'active'}
            disabled={progressVisible && progressStatus === 'active' || parseFloat(usdtBalance) === 0}
          >
            发送USDT
          </Button>
          <Button 
            onClick={() => {
              usdtForm.resetFields();
              loadUSDTBalance(usdtService);
            }}
            size="large"
            disabled={progressVisible && progressStatus === 'active'}
          >
            刷新余额
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );

  // 根据不同tab显示不同的列
  const getColumns = () => {
    if (activeTab === 'log') {
      // 日志数据的列（来自合约）
      return [
        {
          title: 'ID',
          dataIndex: 'id',
          key: 'id',
          width: 80,
          render: (id) => <Tag color="blue">#{id}</Tag>
        },
        {
          title: '数据类型',
          dataIndex: 'dataType',
          key: 'dataType',
          width: 100,
          render: (type) => <Tag color="orange">日志</Tag>
        },
        {
          title: '内容',
          dataIndex: 'content',
          key: 'content',
          ellipsis: true,
          render: (content) => {
            try {
              const parsed = JSON.parse(content);
              const displayText = `${parsed.logLevel}: ${parsed.message.slice(0, 50)}...`;
              return (
                <div style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {displayText}
                </div>
              );
            } catch (e) {
              return (
                <div style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {content}
                </div>
              );
            }
          }
        },
        {
          title: '创建者',
          dataIndex: 'creator',
          key: 'creator',
          width: 120,
          render: (creator) => (
            <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
              {creator.slice(0, 6)}...{creator.slice(-4)}
            </span>
          )
        },
        {
          title: '时间',
          dataIndex: 'timestamp',
          key: 'timestamp',
          width: 160,
          render: (timestamp) => new Date(timestamp * 1000).toLocaleString('zh-CN')
        }
      ];
    } else {
      // 转账记录的列（来自localStorage）
      return [
        {
          title: '交易哈希',
          dataIndex: 'txHash',
          key: 'txHash',
          width: 150,
          render: (hash) => (
            <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
              {hash ? `${hash.slice(0, 8)}...${hash.slice(-6)}` : 'N/A'}
            </span>
          )
        },
        {
          title: '类型',
          dataIndex: 'dataType',
          key: 'dataType',
          width: 80,
          render: (type) => {
            let color = type === 'transfer' ? 'blue' : 'gold';
            let text = type === 'transfer' ? 'ETH' : 'USDT';
            return <Tag color={color}>{text}</Tag>;
          }
        },
        {
          title: '金额',
          dataIndex: 'amount',
          key: 'amount',
          width: 100,
          render: (amount, record) => `${amount} ${record.token || 'ETH'}`
        },
        {
          title: '接收地址',
          dataIndex: 'toAddress',
          key: 'toAddress',
          width: 120,
          render: (address) => (
            <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          )
        },
        {
          title: '时间',
          dataIndex: 'timestamp',
          key: 'timestamp',
          width: 160,
          render: (timestamp) => new Date(timestamp).toLocaleString('zh-CN')
        },
        {
          title: '状态',
          dataIndex: 'status',
          key: 'status',
          width: 80,
          render: (status) => (
            <Tag color={status === 'success' ? 'success' : 'error'}>
              {status === 'success' ? '成功' : '失败'}
            </Tag>
          )
        }
      ];
    }
  };

  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
        {/* 顶部Header */}
        <Header className="header">
          <div className="header-left">
            <DatabaseOutlined style={{ marginRight: '8px', fontSize: '18px' }} />
            <span className="header-title">区块链钱包系统</span>
          </div>
          
          <div className="header-right">
            <Space>
              {/* 钱包连接组件 */}
              <WalletConnection onAccountChange={setAccount} />
            </Space>
          </div>
        </Header>
        
        <Content className="main-content">
          {/* 功能选择标签页 */}
          <Card className="main-input-card">
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              size="large"
              className="data-tabs"
            >
              <TabPane 
                tab={
                  <span>
                    <TransactionOutlined />
                    ETH转账
                  </span>
                } 
                key="transfer"
              >
                <div className="tab-content">
                  <h3>直接钱包转账</h3>
                  <p className="tab-description">使用连接的钱包直接发送ETH到指定地址</p>
                  {renderTransferForm()}
                </div>
              </TabPane>
              
              <TabPane 
                tab={
                  <span>
                    <FileTextOutlined />
                    日志上链
                  </span>
                } 
                key="log"
              >
                <div className="tab-content">
                  <h3>系统日志数据上链</h3>
                  <p className="tab-description">将日志数据永久存储到区块链合约中</p>
                  {renderLogForm()}
                </div>
              </TabPane>
              
              <TabPane 
                tab={
                  <span>
                    <SendOutlined />
                    USDT转账
                  </span>
                } 
                key="usdt"
              >
                <div className="tab-content">
                  <h3>USDT代币转账</h3>
                  <p className="tab-description">发送USDT代币到指定地址</p>
                  {renderUsdtForm()}
                </div>
              </TabPane>
            </Tabs>
          </Card>
          
          {/* 返回按钮 */}
          <div className="back-button">
            <Button 
              icon={<LeftOutlined />} 
              type="text"
            >
              返回
            </Button>
          </div>
          
          {/* 数据记录展示区域 */}
          <Card className="records-card" title={
            activeTab === 'log' ? "区块链日志记录" : "转账交易记录"
          }>
            <div className="search-box">
              <Input
                placeholder={activeTab === 'log' ? "搜索日志记录..." : "搜索转账记录..."}
                prefix={<SearchOutlined />}
                style={{ width: 300, marginBottom: 16 }}
                allowClear
                onPressEnter={handleSearch}
              />
              <Button 
                type="primary" 
                icon={<SearchOutlined />} 
                onClick={handleSearch}
                loading={loading}
                style={{ marginLeft: 8 }}
              >
                搜索
              </Button>
            </div>
            
            {/* 统计信息 */}
            {account && (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                  <Statistic title="总记录数" value={stats.total} />
                </Col>
                <Col span={8}>
                  <Statistic title={activeTab === 'log' ? "活跃记录" : "成功交易"} value={stats.active} />
                </Col>
                <Col span={8}>
                  <Statistic title="在线用户" value={account ? 1 : 0} />
                </Col>
              </Row>
            )}
            
            {/* 记录表格 */}
            <Table
              columns={getColumns()}
              dataSource={dataRecords}
              rowKey={activeTab === 'log' ? "id" : "id"}
              loading={loading}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `总共 ${total} 条记录`,
                pageSize: 10
              }}
              scroll={{ x: 800, y: 500 }}
              size="small"
            />
          </Card>
        </Content>

        {/* 进度条组件 */}
        <ProgressBar
          visible={progressVisible}
          progress={progressValue}
          status={progressStatus}
          message={progressMessage}
          onCancel={handleProgressClose}
        />
      </Layout>
    </Web3ReactProvider>
  );
}

export default App;
