import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Menu, Card, Form, Input, InputNumber, Button, Row, Col, message, Tabs, Table, Modal, Badge, Typography, Space, Divider } from 'antd';
import { SendOutlined, HistoryOutlined, WalletOutlined, DatabaseOutlined, EyeOutlined } from '@ant-design/icons';
import { Web3ReactProvider } from '@web3-react/core';
import { ethers } from 'ethers';

// 导入组件和服务
import WalletConnection from './components/WalletConnection';
import ProgressBar from './components/ProgressBar';
import ETHTransferService from './services/ETHTransferService';
import USDTService from './services/USDTService';
import DataStorageService from './services/DataStorageService';
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
  const [customDataRecords, setCustomDataRecords] = useState([]);
  const [activeTab, setActiveTab] = useState('eth-transfer'); // 新增：追踪当前活动标签
  
  // 进度条状态
  const [progressVisible, setProgressVisible] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');

  // Modal状态
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // 表单实例
  const [ethTransferForm] = Form.useForm();
  const [usdtTransferForm] = Form.useForm();
  const [customDataForm] = Form.useForm();

  // 服务实例
  const [ethTransferService] = useState(() => new ETHTransferService());
  const [usdtService] = useState(() => new USDTService());
  const [dataStorageService] = useState(() => new DataStorageService());

  // 进度条控制函数
  const showProgress = () => setProgressVisible(true);
  const hideProgress = () => setProgressVisible(false);
  const updateProgress = (percent, status) => {
    setProgressPercent(percent);
    setProgressStatus(status);
    if (percent >= 100 || percent < 0) {
      setTimeout(hideProgress, 2000);
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

        // 获取网络信息
        try {
          const networkInfo = await ethTransferService.getCurrentNetwork();
          setNetwork(networkInfo);
        } catch (error) {
          console.error('Failed to get network info:', error);
        }

        // 加载交易记录
        loadTransactionRecords();
        loadCustomDataRecords();

      } else {
        // 钱包断开连接
        setAccount(null);
        setEthBalance('0');
        setUsdtBalance('0');
        setNetwork(null);
        setTransactionRecords([]);
        setCustomDataRecords([]);
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

  // 保存交易记录
  const saveTransactionRecord = (record) => {
    const newRecord = {
      ...record,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleString()
    };
    const updatedRecords = [newRecord, ...transactionRecords];
    setTransactionRecords(updatedRecords);
    localStorage.setItem('transactionRecords', JSON.stringify(updatedRecords));
  };

  // 加载交易记录
  const loadTransactionRecords = () => {
    try {
      const stored = localStorage.getItem('transactionRecords');
      if (stored) {
        setTransactionRecords(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load transaction records:', error);
    }
  };

  // 保存自定义数据记录
  const saveCustomDataRecord = (record) => {
    const newRecord = {
      ...record,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleString()
    };
    const updatedRecords = [newRecord, ...customDataRecords];
    setCustomDataRecords(updatedRecords);
    localStorage.setItem('customDataRecords', JSON.stringify(updatedRecords));
  };

  // 加载自定义数据记录
  const loadCustomDataRecords = () => {
    try {
      const stored = localStorage.getItem('customDataRecords');
      if (stored) {
        setCustomDataRecords(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load custom data records:', error);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadTransactionRecords();
    loadCustomDataRecords();
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

      // 尝试标准转账（带备注）
      let result;
      try {
        result = await ethTransferService.transferETH(
          values.toAddress,
          values.amount,
          values.memo || '',
          updateProgress
        );
      } catch (error) {
        // 如果带数据的转账失败，尝试简化转账
        console.log('Standard transfer failed, trying simple transfer:', error.message);
        updateProgress(30, '使用简化模式重试...');
        
        result = await ethTransferService.transferETHSimple(
          values.toAddress,
          values.amount,
          updateProgress
        );
        
        // 添加简化转账的标记
        result.memoIncludedOnChain = false;
        result.memo = values.memo || '';
      }

      // 保存交易记录（包含备注，即使未上链）
      saveTransactionRecord({
        dataType: 'transfer',
        txHash: result.txHash,
        amount: result.amount,
        token: 'ETH',
        toAddress: result.toAddress,
        fromAddress: result.fromAddress,
        customData: { 
          memo: values.memo || '',
          memoIncludedOnChain: result.memoIncludedOnChain || false,
          isContract: result.isContract || false
        },
        status: result.status,
        gasUsed: result.gasUsed
      });

      message.success('ETH转账成功！');
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
        status: result.receipt.status === 1 ? 'success' : 'failed',
        gasUsed: result.receipt.gasUsed.toString()
      });

      message.success('USDT转账成功！');
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

  // 自定义数据提交处理
  const handleCustomDataSubmit = async (values) => {
    if (!account) {
      message.error('请先连接钱包');
      return;
    }

    setLoading(true);
    showProgress();
    
    try {
      updateProgress(10, '开始提交自定义数据...');

      const result = await dataStorageService.storeCustomData(
        values.dataType,
        values.customData,
        updateProgress
      );

      // 保存记录
      saveCustomDataRecord({
        dataType: values.dataType,
        customData: values.customData,
        txHash: result.txHash,
        fromAddress: account,
        status: result.status,
        gasUsed: result.gasUsed
      });

      message.success('自定义数据提交成功！');
      customDataForm.resetFields();

    } catch (error) {
      console.error('自定义数据提交失败:', error);
      message.error('数据提交失败: ' + error.message);
      updateProgress(-1, '数据提交失败: ' + error.message);
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
          extra="备注信息会尝试写入区块链交易数据。如果失败，将保存在本地记录中。"
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

  // 自定义数据表单组件
  const CustomDataForm = () => {
    return (
      <Form
        form={customDataForm}
        layout="vertical"
        onFinish={handleCustomDataSubmit}
        disabled={!account}
      >
        <Form.Item
          label="数据类型"
          name="dataType"
          rules={[{ required: true, message: '请输入数据类型' }]}
        >
          <Input 
            placeholder="例如：message、document、log等" 
            autoComplete="off"
            spellCheck={false}
          />
        </Form.Item>

        <Form.Item
          label="自定义数据"
          name="customData"
          rules={[{ required: true, message: '请输入要存储的数据' }]}
        >
          <Input.TextArea
            placeholder="输入要存储到区块链的自定义数据..."
            rows={6}
            showCount
            maxLength={1000}
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
            icon={<DatabaseOutlined />}
          >
            {!account ? '请先连接钱包' : '提交数据到链上'}
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
      render: (token) => <Badge color={token === 'ETH' ? 'blue' : 'green'} text={token} />
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => `${amount} ${record.token}`
    },
    {
      title: '接收地址',
      dataIndex: 'toAddress',
      key: 'toAddress',
      render: (address) => `${address.slice(0, 10)}...${address.slice(-8)}`
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge 
          status={status === 'success' ? 'success' : 'error'} 
          text={status === 'success' ? '成功' : '失败'} 
        />
      )
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

  // 自定义数据记录表格列定义
  const customDataColumns = [
    {
      title: '数据类型',
      dataIndex: 'dataType',
      key: 'dataType'
    },
    {
      title: '数据预览',
      dataIndex: 'customData',
      key: 'customData',
      render: (data) => data.length > 50 ? `${data.slice(0, 50)}...` : data
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge 
          status={status === 'success' ? 'success' : 'error'} 
          text={status === 'success' ? '成功' : '失败'} 
        />
      )
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
        {progressVisible && (
          <Card style={{ marginBottom: 24 }}>
            <ProgressBar
              visible={progressVisible}
              percent={progressPercent}
              status={progressStatus}
            />
          </Card>
        )}

        {account && (
          <Row gutter={24} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Card>
                <div style={{ textAlign: 'center' }}>
                  <Title level={4}>ETH 余额</Title>
                  <Text style={{ fontSize: '24px', color: '#1890ff' }}>
                    {parseFloat(ethBalance).toFixed(6)}
                  </Text>
                </div>
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <div style={{ textAlign: 'center' }}>
                  <Title level={4}>USDT 余额</Title>
                  <Text style={{ fontSize: '24px', color: '#52c41a' }}>
                    {activeTab === 'usdt-transfer' ? parseFloat(usdtBalance).toFixed(2) : '需切换到USDT页面'}
                  </Text>
                </div>
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <div style={{ textAlign: 'center' }}>
                  <Title level={4}>网络</Title>
                  <Text style={{ fontSize: '16px' }}>
                    {network ? `${network.name} (${network.chainId})` : '未连接'}
                  </Text>
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* 功能标签页 - 只包含操作功能 */}
        <Card style={{ marginBottom: 24 }}>
          <Tabs defaultActiveKey="eth-transfer" onChange={handleTabChange}>
            <TabPane tab={<span><SendOutlined />ETH 转账</span>} key="eth-transfer">
              <ETHTransferForm />
            </TabPane>

            <TabPane tab={<span><SendOutlined />USDT 转账</span>} key="usdt-transfer">
              <USDTTransferForm />
            </TabPane>

            <TabPane tab={<span><DatabaseOutlined />自定义数据</span>} key="custom-data">
              <CustomDataForm />
            </TabPane>
          </Tabs>
        </Card>

        {/* 记录展示区域 - 独立于标签页 */}
        <Row gutter={24}>
          <Col span={12}>
            <Card 
              title={<span><HistoryOutlined /> 转账记录</span>}
              extra={
                <Badge 
                  count={transactionRecords.length} 
                  showZero 
                  style={{ backgroundColor: '#52c41a' }} 
                />
              }
            >
              <Table
                columns={transactionColumns}
                dataSource={transactionRecords}
                rowKey="id"
                pagination={{ pageSize: 5, size: 'small' }}
                scroll={{ x: 600 }}
                size="small"
              />
            </Card>
          </Col>
          
          <Col span={12}>
            <Card 
              title={<span><DatabaseOutlined /> 数据记录</span>}
              extra={
                <Badge 
                  count={customDataRecords.length} 
                  showZero 
                  style={{ backgroundColor: '#1890ff' }} 
                />
              }
            >
              <Table
                columns={customDataColumns}
                dataSource={customDataRecords}
                rowKey="id"
                pagination={{ pageSize: 5, size: 'small' }}
                scroll={{ x: 600 }}
                size="small"
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
              {selectedRecord.gasUsed && (
                <Paragraph><strong>Gas使用量:</strong> {selectedRecord.gasUsed}</Paragraph>
              )}

              {selectedRecord.customData && typeof selectedRecord.customData === 'object' && (
                <>
                  <Divider>自定义数据</Divider>
                  {selectedRecord.customData.memo && (
                    <Paragraph>
                      <strong>备注:</strong> {selectedRecord.customData.memo}
                      {selectedRecord.customData.memoIncludedOnChain ? (
                        <Badge status="success" text="已写入区块链" style={{ marginLeft: 8 }} />
                      ) : (
                        <Badge status="warning" text="仅本地存储" style={{ marginLeft: 8 }} />
                      )}
                    </Paragraph>
                  )}
                  {selectedRecord.customData.isContract !== undefined && (
                    <Paragraph><strong>目标类型:</strong> {selectedRecord.customData.isContract ? '智能合约' : '普通地址'}</Paragraph>
                  )}
                </>
              )}

              {selectedRecord.customData && typeof selectedRecord.customData === 'string' && (
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