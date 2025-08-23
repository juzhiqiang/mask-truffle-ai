import React, { useState, useEffect } from 'react';
import { Web3ReactProvider } from '@web3-react/core';
import { Web3Provider } from '@ethersproject/providers';
import { Layout, Card, Input, Button, Select, Table, Space, Modal, Form, message, Tag, Statistic, Row, Col } from 'antd';
import { SearchOutlined, PlusOutlined, WalletOutlined, DatabaseOutlined, LeftOutlined } from '@ant-design/icons';
import WalletConnection from './components/WalletConnection';
import DataStorageService from './services/DataStorageService';
import './App.css';

const { Header, Content } = Layout;
const { Option } = Select;
const { TextArea } = Input;

function getLibrary(provider) {
  const library = new Web3Provider(provider);
  library.pollingInterval = 12000;
  return library;
}

function App() {
  const [searchType, setSearchType] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [dataRecords, setDataRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [stats, setStats] = useState({ total: 0, active: 0, totalTypes: 0 });
  const [account, setAccount] = useState('');
  const [dataService, setDataService] = useState(null);

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
      let records = [];
      
      if (searchType === 'all') {
        records = await dataService.getActiveRecords(0, 50);
      } else if (searchType === 'type' && searchValue) {
        const recordIds = await dataService.getRecordsByType(searchValue);
        records = await Promise.all(
          recordIds.map(id => dataService.getDataRecord(id))
        );
      } else if (searchType === 'creator' && searchValue) {
        const recordIds = await dataService.getRecordsByCreator(searchValue);
        records = await Promise.all(
          recordIds.map(id => dataService.getDataRecord(id))
        );
      } else if (searchType === 'id' && searchValue) {
        const record = await dataService.getDataRecord(parseInt(searchValue));
        records = [record];
      }
      
      setDataRecords(records.filter(record => record && record.isActive));
    } catch (error) {
      console.error('搜索失败:', error);
      message.error('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddData = async (values) => {
    if (!dataService) {
      message.warning('请先连接钱包');
      return;
    }

    try {
      await dataService.storeData(values.dataType, values.content);
      message.success('数据上链成功');
      setIsModalVisible(false);
      form.resetFields();
      await loadInitialData(dataService);
      await loadStats(dataService);
    } catch (error) {
      console.error('上链失败:', error);
      message.error('数据上链失败');
    }
  };

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
      width: 120,
      render: (type) => <Tag color="green">{type}</Tag>
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (content) => (
        <div style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {content}
        </div>
      )
    },
    {
      title: '创建者',
      dataIndex: 'creator',
      key: 'creator',
      width: 150,
      render: (creator) => (
        <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>
          {creator.slice(0, 6)}...{creator.slice(-4)}
        </span>
      )
    },
    {
      title: '时间戳',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
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
              {/* 网络选择器 */}
              <Select defaultValue="ETH" style={{ width: 80 }} size="small">
                <Option value="ETH">ETH</Option>
                <Option value="BSC">BSC</Option>
                <Option value="Polygon">Polygon</Option>
              </Select>
              
              {/* 测试标识 */}
              <div className="test-badge">
                <div>测试</div>
                <div>未编</div>
              </div>
              
              {/* 钱包连接 */}
              <WalletConnection onAccountChange={setAccount} />
            </Space>
          </div>
        </Header>
        
        <Content className="main-content">
          {/* 查询方式选择器 */}
          <div className="query-selector">
            <Space>
              <Button 
                type={searchType === 'transfer' ? 'primary' : 'default'}
                onClick={() => setSearchType('transfer')}
              >
                转账方式
              </Button>
              <Button 
                type={searchType === 'address' ? 'primary' : 'default'}
                onClick={() => setSearchType('address')}
              >
                自定义式
              </Button>
              <Button 
                type={searchType === 'usdt' ? 'primary' : 'default'}
                onClick={() => setSearchType('usdt')}
              >
                查送USDT的方式
              </Button>
            </Space>
          </div>
          
          {/* 主要输入区域 */}
          <Card className="main-input-card">
            <div className="input-area">
              <Input.TextArea
                placeholder="请输入查询内容..."
                rows={8}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                style={{ 
                  border: '2px solid #d9d9d9',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
          </Card>
          
          {/* 操作按钮区域 */}
          <div className="action-buttons">
            <Space>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
                loading={loading}
                size="large"
              >
                查询
              </Button>
              
              <Button
                icon={<PlusOutlined />}
                onClick={() => setIsModalVisible(true)}
                disabled={!account}
                size="large"
              >
                添加数据
              </Button>
            </Space>
          </div>
          
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
              />
            </div>
            
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
              scroll={{ x: 800, y: 400 }}
              size="small"
            />
          </Card>
        </Content>
        
        {/* 添加数据的模态框 */}
        <Modal
          title="添加新数据"
          visible={isModalVisible}
          onCancel={() => {
            setIsModalVisible(false);
            form.resetFields();
          }}
          footer={null}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleAddData}
          >
            <Form.Item
              label="数据类型"
              name="dataType"
              rules={[{ required: true, message: '请输入数据类型' }]}
            >
              <Input placeholder="例如：transaction, contract, user" />
            </Form.Item>
            
            <Form.Item
              label="数据内容"
              name="content"
              rules={[{ required: true, message: '请输入数据内容' }]}
            >
              <TextArea rows={6} placeholder="输入要上链的数据内容" />
            </Form.Item>
            
            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => {
                  setIsModalVisible(false);
                  form.resetFields();
                }}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit">
                  上链
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Layout>
    </Web3ReactProvider>
  );
}

export default App;
