import React, { useState, useEffect } from 'react';
import { Web3ReactProvider } from '@web3-react/core';
import { Web3Provider } from '@ethersproject/providers';
import { Layout, Card, Input, Button, Select, Table, Space, Modal, Form, message, Tag, Statistic, Row, Col, Tabs } from 'antd';
import { SearchOutlined, PlusOutlined, WalletOutlined, DatabaseOutlined, LeftOutlined, SendOutlined, FileTextOutlined, TransactionOutlined } from '@ant-design/icons';
import WalletConnection from './components/WalletConnection';
import DataStorageService from './services/DataStorageService';
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

  // 表单数据状态
  const [transferForm] = Form.useForm();
  const [logForm] = Form.useForm();
  const [usdtForm] = Form.useForm();

  useEffect(() => {
    if (account) {
      const service = new DataStorageService();
      setDataService(service);
      loadInitialData(service);
      loadStats(service);
    }
  }, [account]);

  const loadInitialData = async (service) => {
    setLoading(true);
    try {
      const records = await service.getActiveRecords(0, 10);
      setDataRecords(records);
    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('加载数据失败');
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
    }
  };

  const handleSearch = async () => {
    if (!dataService) {
      message.warning('请先连接钱包');
      return;
    }

    setLoading(true);
    try {
      const records = await dataService.getActiveRecords(0, 50);
      setDataRecords(records.filter(record => record && record.isActive));
    } catch (error) {
      console.error('搜索失败:', error);
      message.error('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values, type) => {
    if (!dataService) {
      message.warning('请先连接钱包');
      return;
    }

    try {
      let dataType = type;
      let content = '';
      
      switch (type) {
        case 'transfer':
          content = JSON.stringify({
            fromAddress: values.fromAddress,
            toAddress: values.toAddress,
            amount: values.amount,
            token: values.token || 'ETH',
            gasPrice: values.gasPrice,
            timestamp: new Date().toISOString()
          });
          break;
        case 'log':
          content = JSON.stringify({
            logLevel: values.logLevel,
            message: values.message,
            source: values.source,
            timestamp: new Date().toISOString()
          });
          break;
        case 'usdt':
          content = JSON.stringify({
            fromAddress: values.fromAddress,
            toAddress: values.toAddress,
            usdtAmount: values.usdtAmount,
            transactionHash: values.transactionHash,
            network: values.network || 'Ethereum',
            timestamp: new Date().toISOString()
          });
          break;
        default:
          content = JSON.stringify(values);
      }

      await dataService.storeData(dataType, content);
      message.success(`${getTabName(type)}数据上链成功`);
      
      // 重置对应的表单
      if (type === 'transfer') transferForm.resetFields();
      if (type === 'log') logForm.resetFields();
      if (type === 'usdt') usdtForm.resetFields();
      
      await loadInitialData(dataService);
      await loadStats(dataService);
    } catch (error) {
      console.error('上链失败:', error);
      message.error('数据上链失败: ' + error.message);
    }
  };

  const getTabName = (type) => {
    switch (type) {
      case 'transfer': return '转账';
      case 'log': return '日志';
      case 'usdt': return 'USDT发送';
      default: return '';
    }
  };

  const renderTransferForm = () => (
    <Form
      form={transferForm}
      layout="vertical"
      onFinish={(values) => handleSubmit(values, 'transfer')}
      className="data-form"
    >
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            label="发送地址"
            name="fromAddress"
            rules={[{ required: true, message: '请输入发送地址' }]}
          >
            <Input placeholder="0x..." />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="接收地址"
            name="toAddress"
            rules={[{ required: true, message: '请输入接收地址' }]}
          >
            <Input placeholder="0x..." />
          </Form.Item>
        </Col>
      </Row>
      
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item
            label="转账金额"
            name="amount"
            rules={[{ required: true, message: '请输入转账金额' }]}
          >
            <Input type="number" placeholder="0.0" step="0.000001" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            label="代币类型"
            name="token"
            initialValue="ETH"
          >
            <Select>
              <Option value="ETH">ETH</Option>
              <Option value="USDC">USDC</Option>
              <Option value="USDT">USDT</Option>
              <Option value="DAI">DAI</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            label="Gas价格 (Gwei)"
            name="gasPrice"
          >
            <Input type="number" placeholder="20" />
          </Form.Item>
        </Col>
      </Row>
      
      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" icon={<TransactionOutlined />} size="large">
            提交转账数据
          </Button>
          <Button onClick={() => transferForm.resetFields()} size="large">
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
          <Button type="primary" htmlType="submit" icon={<FileTextOutlined />} size="large">
            提交日志数据
          </Button>
          <Button onClick={() => logForm.resetFields()} size="large">
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
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            label="发送地址"
            name="fromAddress"
            rules={[{ required: true, message: '请输入发送地址' }]}
          >
            <Input placeholder="0x..." />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="接收地址"
            name="toAddress"
            rules={[{ required: true, message: '请输入接收地址' }]}
          >
            <Input placeholder="0x..." />
          </Form.Item>
        </Col>
      </Row>
      
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item
            label="USDT金额"
            name="usdtAmount"
            rules={[{ required: true, message: '请输入USDT金额' }]}
          >
            <Input type="number" placeholder="0.00" step="0.01" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            label="网络"
            name="network"
            initialValue="Ethereum"
          >
            <Select>
              <Option value="Ethereum">Ethereum</Option>
              <Option value="BSC">BSC</Option>
              <Option value="Polygon">Polygon</Option>
              <Option value="Tron">Tron</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            label="交易哈希"
            name="transactionHash"
          >
            <Input placeholder="0x..." />
          </Form.Item>
        </Col>
      </Row>
      
      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" icon={<SendOutlined />} size="large">
            提交USDT数据
          </Button>
          <Button onClick={() => usdtForm.resetFields()} size="large">
            重置
          </Button>
        </Space>
      </Form.Item>
    </Form>
  );

  const columns = [
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
      render: (type) => {
        let color = 'green';
        let text = type;
        if (type === 'transfer') {
          color = 'blue';
          text = '转账';
        } else if (type === 'log') {
          color = 'orange';
          text = '日志';
        } else if (type === 'usdt') {
          color = 'gold';
          text = 'USDT';
        }
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (content) => {
        try {
          const parsed = JSON.parse(content);
          let displayText = content;
          
          if (parsed.amount || parsed.usdtAmount) {
            displayText = `金额: ${parsed.amount || parsed.usdtAmount} | ${parsed.fromAddress?.slice(0, 8)}...→${parsed.toAddress?.slice(0, 8)}...`;
          } else if (parsed.message) {
            displayText = `${parsed.logLevel}: ${parsed.message.slice(0, 50)}...`;
          }
          
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
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'error'}>
          {isActive ? '活跃' : '停用'}
        </Tag>
      )
    }
  ];

  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
        {/* 顶部Header */}
        <Header className="header">
          <div className="header-left">
            <DatabaseOutlined style={{ marginRight: '8px', fontSize: '18px' }} />
            <span className="header-title">数据上链系统</span>
          </div>
          
          <div className="header-right">
            <Space>
              {/* 钱包连接组件 */}
              <WalletConnection onAccountChange={setAccount} />
            </Space>
          </div>
        </Header>
        
        <Content className="main-content">
          {/* 数据上链方式选择 */}
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
                    转账方式
                  </span>
                } 
                key="transfer"
              >
                <div className="tab-content">
                  <h3>区块链转账数据上链</h3>
                  <p className="tab-description">记录ETH或其他代币的转账交易信息</p>
                  {renderTransferForm()}
                </div>
              </TabPane>
              
              <TabPane 
                tab={
                  <span>
                    <FileTextOutlined />
                    日志方式
                  </span>
                } 
                key="log"
              >
                <div className="tab-content">
                  <h3>系统日志数据上链</h3>
                  <p className="tab-description">记录应用程序运行日志和系统事件</p>
                  {renderLogForm()}
                </div>
              </TabPane>
              
              <TabPane 
                tab={
                  <span>
                    <SendOutlined />
                    发送USDT的方式
                  </span>
                } 
                key="usdt"
              >
                <div className="tab-content">
                  <h3>USDT转账数据上链</h3>
                  <p className="tab-description">专门记录USDT稳定币的转账信息</p>
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
          <Card className="records-card" title="数据上链的记录">
            <div className="search-box">
              <Input
                placeholder="search（请作为上indexed）"
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
            
            {/* 统计信息 - 只有连接钱包后才显示 */}
            {account && (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                  <Statistic title="总记录数" value={stats.total} />
                </Col>
                <Col span={8}>
                  <Statistic title="活跃记录" value={stats.active} />
                </Col>
                <Col span={8}>
                  <Statistic title="在线用户" value={account ? 1 : 0} />
                </Col>
              </Row>
            )}
            
            {/* 记录表格 */}
            <Table
              columns={columns}
              dataSource={dataRecords}
              rowKey="id"
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
      </Layout>
    </Web3ReactProvider>
  );
}

export default App;
