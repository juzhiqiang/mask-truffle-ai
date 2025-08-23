import React, { useState, useEffect } from 'react';
import { Web3ReactProvider } from '@web3-react/core';
import { Web3Provider } from '@ethersproject/providers';
import { Layout, Card, Input, Button, Select, Table, Space, Modal, Form, message, Tag, Statistic } from 'antd';
import { SearchOutlined, PlusOutlined, WalletOutlined, DatabaseOutlined } from '@ant-design/icons';
import WalletConnection from './components/WalletConnection';
import DataStorageService from './services/DataStorageService';
import './App.css';

const { Header, Content, Sider } = Layout;
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
        <div style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
      <Layout style={{ minHeight: '100vh' }}>
        <Header style={{ background: '#001529', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
            <DatabaseOutlined style={{ marginRight: '8px' }} />
            数据上链系统
          </div>
          <WalletConnection onAccountChange={setAccount} />
        </Header>
        
        <Layout>
          <Sider width={300} style={{ background: '#f0f2f5', padding: '24px' }}>
            <Card title="数据上链记录" size="small" style={{ marginBottom: '16px' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Statistic title="总记录数" value={stats.total} />
                <Statistic title="活跃记录" value={stats.active} />
              </Space>
            </Card>

            <Card title="查询条件" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Select
                  style={{ width: '100%' }}
                  value={searchType}
                  onChange={setSearchType}
                  placeholder="选择查询类型"
                >
                  <Option value="all">查看全部</Option>
                  <Option value="type">按类型查询</Option>
                  <Option value="creator">按创建者查询</Option>
                  <Option value="id">按ID查询</Option>
                </Select>
                
                {searchType !== 'all' && (
                  <Input
                    placeholder={
                      searchType === 'type' ? '输入数据类型' :
                      searchType === 'creator' ? '输入创建者地址' :
                      '输入记录ID'
                    }
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                  />
                )}
                
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleSearch}
                  loading={loading}
                  style={{ width: '100%' }}
                >
                  查询
                </Button>
                
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => setIsModalVisible(true)}
                  disabled={!account}
                  style={{ width: '100%' }}
                >
                  添加数据
                </Button>
              </Space>
            </Card>

            <div style={{ marginTop: '16px', padding: '12px', background: '#fff', borderRadius: '6px', fontSize: '12px' }}>
              <div><strong>数据类型示例：</strong></div>
              <div>• transaction (交易数据)</div>
              <div>• contract (合约数据)</div>
              <div>• user (用户数据)</div>
              <div>• log (日志数据)</div>
            </div>
          </Sider>
          
          <Content style={{ padding: '24px' }}>
            <Card 
              title="数据查询结果" 
              style={{ height: '100%' }}
              extra={
                <Space>
                  <span>共 {dataRecords.length} 条记录</span>
                  {account && (
                    <Tag color="green">
                      <WalletOutlined /> 已连接钱包
                    </Tag>
                  )}
                </Space>
              }
            >
              <Table
                columns={columns}
                dataSource={dataRecords}
                rowKey="id"
                loading={loading}
                pagination={{
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `总共 ${total} 条记录`,
                }}
                scroll={{ x: 800 }}
              />
            </Card>
          </Content>
        </Layout>
        
        <Modal
          title="添加新数据"
          visible={isModalVisible}
          onCancel={() => {
            setIsModalVisible(false);
            form.resetFields();
          }}
          footer={null}
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
              <TextArea rows={4} placeholder="输入要上链的数据内容" />
            </Form.Item>
            
            <Form.Item style={{ marginBottom: 0 }}>
              <Space>
                <Button type="primary" htmlType="submit">
                  上链
                </Button>
                <Button onClick={() => {
                  setIsModalVisible(false);
                  form.resetFields();
                }}>
                  取消
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
