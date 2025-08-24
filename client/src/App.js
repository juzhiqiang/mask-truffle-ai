import React, { useState, useEffect, useCallback } from 'react';
import { 
  Layout, 
  Card, 
  Tabs, 
  Table, 
  Button, 
  Input, 
  Form, 
  message, 
  Space, 
  Tag, 
  Tooltip, 
  Modal, 
  Alert, 
  Row, 
  Col, 
  Statistic,
  InputNumber
} from 'antd';
import {
  DatabaseOutlined,
  TransactionOutlined,
  FileTextOutlined,
  SendOutlined,
  SearchOutlined,
  EyeOutlined,
  LeftOutlined
} from '@ant-design/icons';
import { Web3ReactProvider } from '@web3-react/core';
import { ethers } from 'ethers';
import './App.css';

// 导入服务
import WalletConnection from './components/WalletConnection';
import ProgressBar from './components/ProgressBar';
import ETHTransferService from './services/ETHTransferService';
import USDTService from './services/USDTService';
import DataStorageService from './services/DataStorageService';

const { Header, Content } = Layout;
const { TabPane } = Tabs;

// Web3 库提供者
const getLibrary = (provider) => {
  return new ethers.providers.Web3Provider(provider);
};

// 初始化服务
const ethTransferService = new ETHTransferService();
const usdtService = new USDTService();
const dataStorageService = new DataStorageService();

function App() {
  // 状态管理
  const [account, setAccount] = useState(null);
  const [activeTab, setActiveTab] = useState('transfer');
  const [loading, setLoading] = useState(false);
  const [dataRecords, setDataRecords] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0 });
  const [progressVisible, setProgressVisible] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [progressStatus, setProgressStatus] = useState('active');
  const [progressMessage, setProgressMessage] = useState('');
  const [customDataModal, setCustomDataModal] = useState({
    visible: false,
    data: null,
    title: ''
  });

  // 表单实例
  const [transferForm] = Form.useForm();
  const [logForm] = Form.useForm();
  const [usdtForm] = Form.useForm();

  // 初始化数据
  useEffect(() => {
    if (account) {
      loadDataRecords();
    }
  }, [account, activeTab]);

  // 加载数据记录
  const loadDataRecords = useCallback(async () => {
    setLoading(true);
    try {
      let records = [];
      
      if (activeTab === 'log') {
        // 从智能合约加载日志数据
        try {
          const contractRecords = await dataStorageService.getActiveRecords(0, 50);
          records = contractRecords || [];
        } catch (error) {
          console.warn('无法从合约加载数据，使用本地存储数据:', error);
          records = JSON.parse(localStorage.getItem('log_records') || '[]');
        }
      } else {
        // 转账记录从本地存储获取
        records = JSON.parse(localStorage.getItem(`${activeTab}_records`) || '[]');
      }

      setDataRecords(records);
      setStats({
        total: records.length,
        active: records.filter(r => r.status === 'success' || r.isActive !== false).length
      });
    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('加载数据失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, account]);

  // 保存交易记录到本地存储
  const saveTransactionRecord = (record) => {
    try {
      const key = `${activeTab}_records`;
      const existingRecords = JSON.parse(localStorage.getItem(key) || '[]');
      const newRecord = {
        ...record,
        id: Date.now(),
        timestamp: Date.now()
      };
      existingRecords.unshift(newRecord);
      localStorage.setItem(key, JSON.stringify(existingRecords.slice(0, 100))); // 只保存最近100条
      loadDataRecords(); // 重新加载数据
    } catch (error) {
      console.error('保存记录失败:', error);
    }
  };

  // 搜索处理
  const handleSearch = () => {
    message.info('搜索功能待实现');
  };

  // 显示自定义数据Modal
  const showCustomDataModal = (data, title) => {
    setCustomDataModal({
      visible: true,
      data,
      title
    });
  };

  // 进度条相关
  const showProgress = (message, status = 'active') => {
    setProgressMessage(message);
    setProgressStatus(status);
    setProgressVisible(true);
    setProgressValue(0);
  };

  const updateProgress = (value, message) => {
    setProgressValue(value);
    if (message) setProgressMessage(message);
    
    if (value === -1) {
      setProgressStatus('exception');
    } else if (value === 100) {
      setProgressStatus('success');
    } else {
      setProgressStatus('active');
    }
  };

  const hideProgress = () => {
    setProgressVisible(false);
    setProgressValue(0);
    setProgressStatus('active');
    setProgressMessage('');
  };

  const handleProgressClose = () => {
    hideProgress();
  };

  // ETH转账表单
  const renderTransferForm = () => {
    const handleTransfer = async (values) => {
      if (!account) {
        message.error('请先连接钱包');
        return;
      }

      try {
        setLoading(true);
        showProgress('正在准备ETH转账...');

        // 验证地址格式
        if (!ethTransferService.isValidAddress(values.toAddress)) {
          throw new Error('接收地址格式无效');
        }

        // 执行真实的ETH转账
        const result = await ethTransferService.transferETH(
          values.toAddress,
          values.amount,
          values.memo || '',
          updateProgress
        );

        message.success('ETH转账成功！');
        
        // 保存交易记录
        saveTransactionRecord({
          dataType: 'transfer',
          txHash: result.txHash,
          amount: result.amount,
          token: 'ETH',
          toAddress: result.toAddress,
          fromAddress: result.fromAddress,
          customData: { memo: result.memo },
          status: result.status,
          gasUsed: result.gasUsed
        });

        transferForm.resetFields();
      } catch (error) {
        console.error('ETH转账失败:', error);
        message.error('ETH转账失败: ' + error.message);
        updateProgress(-1, 'ETH转账失败: ' + error.message);
      } finally {
        setLoading(false);
        setTimeout(hideProgress, 2000);
      }
    };

    return (
      <Form
        form={transferForm}
        layout="vertical"
        onFinish={handleTransfer}
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
              <Input placeholder="0x..." />
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
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="备注信息"
          name="memo"
        >
          <Input.TextArea
            placeholder="可选的转账备注信息"
            rows={2}
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            disabled={!account}
          >
            {!account ? '请先连接钱包' : '发送ETH'}
          </Button>
        </Form.Item>
      </Form>
    );
  };

  // 日志上链表单
  const renderLogForm = () => {
    const handleLogSubmit = async (values) => {
      if (!account) {
        message.error('请先连接钱包');
        return;
      }

      try {
        setLoading(true);
        showProgress('正在将日志上链...');

        // 构建日志数据
        const logData = {
          logLevel: values.logLevel,
          message: values.message,
          module: values.module || 'system',
          timestamp: Date.now()
        };

        try {
          // 尝试调用智能合约存储数据
          const result = await dataStorageService.storeData(
            'log',
            JSON.stringify(logData),
            updateProgress
          );
          
          message.success('日志数据上链成功！');
        } catch (contractError) {
          console.warn('合约调用失败，保存到本地存储:', contractError);
          
          // 如果合约调用失败，保存到本地存储
          saveTransactionRecord({
            dataType: 'log',
            logLevel: values.logLevel,
            message: values.message,
            creator: account,
            customData: { module: values.module || 'system' },
            status: 'success',
            isActive: true
          });
          
          message.success('日志数据已保存！');
          updateProgress(100, '日志数据保存成功！');
        }

        logForm.resetFields();
        loadDataRecords();
      } catch (error) {
        console.error('日志处理失败:', error);
        message.error('日志处理失败: ' + error.message);
        updateProgress(-1, '日志处理失败: ' + error.message);
      } finally {
        setLoading(false);
        setTimeout(hideProgress, 2000);
      }
    };

    return (
      <Form
        form={logForm}
        layout="vertical"
        onFinish={handleLogSubmit}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="日志级别"
              name="logLevel"
              rules={[{ required: true, message: '请选择日志级别' }]}
            >
              <Input placeholder="INFO/WARN/ERROR" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="模块名称"
              name="module"
            >
              <Input placeholder="模块名称" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="日志内容"
          name="message"
          rules={[{ required: true, message: '请输入日志内容' }]}
        >
          <Input.TextArea
            placeholder="详细的日志信息"
            rows={4}
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            disabled={!account}
          >
            {!account ? '请先连接钱包' : '提交上链'}
          </Button>
        </Form.Item>
      </Form>
    );
  };

  // USDT转账表单
  const renderUsdtForm = () => {
    const handleUsdtTransfer = async (values) => {
      if (!account) {
        message.error('请先连接钱包');
        return;
      }

      try {
        setLoading(true);
        showProgress('正在准备USDT转账...');

        // 检查当前网络是否支持USDT
        const supportedNetwork = await usdtService.isCurrentNetworkSupported();
        if (!supportedNetwork) {
          throw new Error('当前网络不支持USDT转账，请切换到Ethereum主网');
        }

        // 执行真实的USDT转账
        const result = await usdtService.transferUSDT(
          values.toAddress,
          values.amount,
          supportedNetwork,
          updateProgress
        );

        message.success('USDT转账成功！');
        
        // 保存交易记录
        saveTransactionRecord({
          dataType: 'usdt',
          txHash: result.txHash,
          amount: result.amount,
          token: 'USDT',
          toAddress: result.toAddress,
          customData: { memo: values.memo, network: result.network },
          status: 'success'
        });

        usdtForm.resetFields();
      } catch (error) {
        console.error('USDT转账失败:', error);
        message.error('USDT转账失败: ' + error.message);
        updateProgress(-1, 'USDT转账失败: ' + error.message);
      } finally {
        setLoading(false);
        setTimeout(hideProgress, 2000);
      }
    };

    return (
      <Form
        form={usdtForm}
        layout="vertical"
        onFinish={handleUsdtTransfer}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="接收地址"
              name="toAddress"
              rules={[
                { required: true, message: '请输入接收地址' },
                { pattern: /^0x[a-fA-F0-9]{40}$/, message: '请输入有效的以太坊地址' }
              ]}
            >
              <Input placeholder="0x..." />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="转账金额 (USDT)"
              name="amount"
              rules={[
                { required: true, message: '请输入转账金额' },
                { type: 'number', min: 1, message: '最小转账金额为1 USDT' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="100"
                min={1}
                step={1}
                precision={2}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="备注信息"
          name="memo"
        >
          <Input.TextArea
            placeholder="可选的转账备注信息"
            rows={2}
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            disabled={!account}
          >
            {!account ? '请先连接钱包' : '发送USDT'}
          </Button>
        </Form.Item>
      </Form>
    );
  };

  // 获取表格列配置
  const getColumns = () => {
    if (activeTab === 'log') {
      return [
        {
          title: 'ID',
          dataIndex: 'id',
          key: 'id',
          width: 80
        },
        {
          title: '日志级别',
          dataIndex: 'logLevel',
          key: 'logLevel',
          width: 100,
          render: (level) => {
            let color = 'default';
            if (level === 'ERROR') color = 'red';
            else if (level === 'WARN') color = 'orange';
            else if (level === 'INFO') color = 'blue';
            return <Tag color={color}>{level}</Tag>;
          }
        },
        {
          title: '日志内容',
          dataIndex: 'message',
          key: 'message',
          ellipsis: true
        },
        {
          title: '自定义数据',
          dataIndex: 'customData',
          key: 'customData',
          width: 120,
          render: (customData) => {
            try {
              if (customData && Object.keys(customData).length > 0) {
                return (
                  <Tooltip title="点击查看自定义数据">
                    <Button 
                      type="link" 
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => showCustomDataModal(customData, '日志自定义数据')}
                    >
                      查看({Object.keys(customData).length})
                    </Button>
                  </Tooltip>
                );
              }
              return <span style={{ color: '#ccc' }}>无</span>;
            } catch (e) {
              return <span style={{ color: '#ccc' }}>-</span>;
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
              {creator ? `${creator.slice(0, 6)}...${creator.slice(-4)}` : 'N/A'}
            </span>
          )
        },
        {
          title: '时间',
          dataIndex: 'timestamp',
          key: 'timestamp',
          width: 160,
          render: (timestamp) => {
            if (!timestamp) return 'N/A';
            // 如果是秒级时间戳，转换为毫秒
            const ts = timestamp < 1e12 ? timestamp * 1000 : timestamp;
            return new Date(ts).toLocaleString('zh-CN');
          }
        }
      ];
    } else {
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
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'N/A'}
            </span>
          )
        },
        {
          title: '自定义数据',
          dataIndex: 'customData',
          key: 'customData',
          width: 100,
          render: (customData, record) => {
            const hasCustomData = customData && Object.keys(customData).length > 0;
            const hasMemo = customData?.memo && customData.memo.trim().length > 0;
            
            if (hasCustomData || hasMemo) {
              return (
                <Tooltip title="点击查看自定义数据和备注">
                  <Button 
                    type="link" 
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => showCustomDataModal(customData, '转账自定义数据')}
                  >
                    查看({hasCustomData ? Object.keys(customData).length : 1})
                  </Button>
                </Tooltip>
              );
            }
            return <span style={{ color: '#ccc' }}>无</span>;
          }
        },
        {
          title: '时间',
          dataIndex: 'timestamp',
          key: 'timestamp',
          width: 160,
          render: (timestamp) => {
            if (!timestamp) return 'N/A';
            return new Date(timestamp).toLocaleString('zh-CN');
          }
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
                  <h3>直接钱包转账（真实区块链交易）</h3>
                  <p className="tab-description">使用连接的钱包直接发送ETH到区块链网络，支持备注信息</p>
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
                  <h3>系统日志数据上链存储</h3>
                  <p className="tab-description">将日志数据和自定义信息永久存储到区块链智能合约中</p>
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
                  <h3>USDT代币转账（真实区块链交易）</h3>
                  <p className="tab-description">发送USDT代币到指定地址，需要在支持的网络上操作</p>
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

        {/* 进度条组件 */}
        <ProgressBar
          visible={progressVisible}
          progress={progressValue}
          status={progressStatus}
          message={progressMessage}
          onCancel={handleProgressClose}
        />

        {/* 自定义数据查看Modal */}
        <Modal
          title={customDataModal.title}
          open={customDataModal.visible}
          onCancel={() => setCustomDataModal({ ...customDataModal, visible: false })}
          footer={[
            <Button key="close" onClick={() => setCustomDataModal({ ...customDataModal, visible: false })}>
              关闭
            </Button>
          ]}
          width={600}
        >
          {customDataModal.data && (
            <div>
              <Alert
                message="自定义数据详情"
                description="以下是记录中包含的所有自定义数据字段"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              
              <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '6px' }}>
                <pre style={{ margin: 0, fontFamily: 'Monaco, Consolas, monospace', fontSize: '13px' }}>
                  {JSON.stringify(customDataModal.data, null, 2)}
                </pre>
              </div>

              <div style={{ marginTop: 16 }}>
                <h4>字段说明：</h4>
                <Table
                  dataSource={Object.entries(customDataModal.data).map(([key, value], index) => ({
                    key: index,
                    field: key,
                    value: typeof value === 'object' ? JSON.stringify(value) : String(value),
                    type: Array.isArray(value) ? 'array' : typeof value
                  }))}
                  columns={[
                    { title: '字段名', dataIndex: 'field', key: 'field' },
                    { title: '值', dataIndex: 'value', key: 'value', ellipsis: true },
                    { 
                      title: '类型', 
                      dataIndex: 'type', 
                      key: 'type',
                      render: (type) => <Tag color="blue">{type}</Tag>
                    }
                  ]}
                  pagination={false}
                  size="small"
                />
              </div>
            </div>
          )}
        </Modal>
      </Layout>
    </Web3ReactProvider>
  );
}

export default App;