import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Modal, 
  Input, 
  Select, 
  DatePicker, 
  Badge, 
  Typography, 
  Space, 
  Row, 
  Col,
  Statistic,
  message,
  Tabs,
  Tag,
  Spin
} from 'antd';
import { 
  EyeOutlined, 
  SearchOutlined, 
  ReloadOutlined,
  BarChartOutlined,
  FilterOutlined,
  ExportOutlined
} from '@ant-design/icons';
import EnhancedLogChainService from '../services/EnhancedLogChainService';

const { Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

const LogViewer = ({ account }) => {
  // 状态管理
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [activeTab, setActiveTab] = useState('user-logs');
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({
    level: '',
    category: '',
    dateRange: null,
    search: ''
  });
  
  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // 服务实例
  const [logService] = useState(() => new EnhancedLogChainService());

  // 日志级别颜色配置
  const LOG_LEVEL_COLORS = {
    DEBUG: 'default',
    INFO: 'blue',
    WARN: 'orange',
    ERROR: 'red',
    FATAL: 'red'
  };

  // 日志级别选项
  const LOG_LEVEL_OPTIONS = [
    { label: '全部级别', value: '' },
    { label: '调试 (DEBUG)', value: 'DEBUG' },
    { label: '信息 (INFO)', value: 'INFO' },
    { label: '警告 (WARN)', value: 'WARN' },
    { label: '错误 (ERROR)', value: 'ERROR' },
    { label: '致命 (FATAL)', value: 'FATAL' }
  ];

  // 加载用户日志
  const loadUserLogs = async (page = 1, pageSize = 10) => {
    if (!account) return;
    
    setLoading(true);
    try {
      const skip = (page - 1) * pageSize;
      const userLogs = await logService.getUserLogsFromGraph(account, pageSize, skip);
      
      setLogs(userLogs);
      setPagination(prev => ({
        ...prev,
        current: page,
        pageSize: pageSize,
        total: userLogs.length >= pageSize ? (page * pageSize + 1) : skip + userLogs.length
      }));
    } catch (error) {
      console.error('加载用户日志失败:', error);
      message.error('加载日志失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 加载分类日志
  const loadCategoryLogs = async (category, page = 1, pageSize = 10) => {
    if (!category) return;
    
    setLoading(true);
    try {
      const skip = (page - 1) * pageSize;
      const categoryLogs = await logService.getLogsByCategoryFromGraph(category, pageSize, skip);
      
      setLogs(categoryLogs);
      setPagination(prev => ({
        ...prev,
        current: page,
        pageSize: pageSize,
        total: categoryLogs.length >= pageSize ? (page * pageSize + 1) : skip + categoryLogs.length
      }));
    } catch (error) {
      console.error('加载分类日志失败:', error);
      message.error('加载分类日志失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 加载统计信息
  const loadStats = async () => {
    try {
      const statsData = await logService.getStatsFromGraph();
      setStats(statsData);
    } catch (error) {
      console.error('加载统计信息失败:', error);
      // 不显示错误信息，因为统计功能是可选的
    }
  };

  // 高级搜索
  const handleAdvancedSearch = async () => {
    if (!account) return;
    
    setLoading(true);
    try {
      // 构建GraphQL查询
      let whereConditions = ['isActive: true'];
      
      if (activeTab === 'user-logs') {
        whereConditions.push(`creator: "${account.toLowerCase()}"`);
      }
      
      if (filters.level) {
        whereConditions.push(`level: ${filters.level}`);
      }
      
      if (filters.category) {
        whereConditions.push(`category: "${filters.category}"`);
      }
      
      if (filters.dateRange && filters.dateRange.length === 2) {
        const startTime = Math.floor(filters.dateRange[0].valueOf() / 1000);
        const endTime = Math.floor(filters.dateRange[1].valueOf() / 1000);
        whereConditions.push(`timestamp_gte: ${startTime}`);
        whereConditions.push(`timestamp_lte: ${endTime}`);
      }

      const query = `
        query SearchLogs {
          logEntries(
            where: { ${whereConditions.join(', ')} }
            orderBy: timestamp
            orderDirection: desc
            first: ${pagination.pageSize}
            skip: ${(pagination.current - 1) * pagination.pageSize}
          ) {
            id
            logId
            creator {
              id
              address
            }
            level
            category
            message
            metadata
            timestamp
            blockNumber
            blockTimestamp
            transactionHash
            isActive
          }
        }
      `;

      const result = await logService.queryLogsFromGraph(query);
      let searchResults = result.logEntries || [];

      // 客户端文本搜索（如果有搜索关键词）
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        searchResults = searchResults.filter(log => 
          log.message.toLowerCase().includes(searchTerm) ||
          log.category.toLowerCase().includes(searchTerm) ||
          log.metadata.toLowerCase().includes(searchTerm) ||
          log.creator.address.toLowerCase().includes(searchTerm)
        );
      }

      setLogs(searchResults);
    } catch (error) {
      console.error('高级搜索失败:', error);
      message.error('搜索失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 重置筛选器
  const resetFilters = () => {
    setFilters({
      level: '',
      category: '',
      dateRange: null,
      search: ''
    });
    if (activeTab === 'user-logs') {
      loadUserLogs();
    }
  };

  // 导出日志数据
  const exportLogs = () => {
    try {
      const exportData = logs.map(log => ({
        ID: log.logId,
        创建者: log.creator?.address || log.creator,
        级别: log.level,
        分类: log.category,
        消息: log.message,
        元数据: log.metadata,
        时间戳: new Date(log.timestamp * 1000).toLocaleString(),
        区块号: log.blockNumber,
        交易哈希: log.transactionHash,
        状态: log.isActive ? '活跃' : '已停用'
      }));

      const csvContent = "data:text/csv;charset=utf-8," 
        + Object.keys(exportData[0]).join(",") + "\n"
        + exportData.map(row => Object.values(row).map(val => `"${val}"`).join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `logs_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success('日志数据导出成功');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败: ' + error.message);
    }
  };

  // 表格列定义
  const columns = [
    {
      title: '日志ID',
      dataIndex: 'logId',
      key: 'logId',
      width: 80,
      render: (logId) => (
        <Text code style={{ fontSize: '12px' }}>
          #{logId}
        </Text>
      )
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level) => (
        <Tag color={LOG_LEVEL_COLORS[level]} style={{ margin: 0 }}>
          {level}
        </Tag>
      )
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category) => (
        <Tag color="blue" style={{ margin: 0, maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {category}
        </Tag>
      )
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (message) => (
        <Paragraph 
          ellipsis={{ rows: 2, expandable: false }}
          style={{ margin: 0, maxWidth: '300px' }}
        >
          {message}
        </Paragraph>
      )
    },
    {
      title: '创建者',
      dataIndex: ['creator', 'address'],
      key: 'creator',
      width: 120,
      render: (address, record) => {
        const creatorAddress = address || record.creator;
        return (
          <Text code style={{ fontSize: '11px' }}>
            {creatorAddress ? `${creatorAddress.slice(0, 6)}...${creatorAddress.slice(-4)}` : '-'}
          </Text>
        );
      }
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 120,
      render: (timestamp) => (
        <Text style={{ fontSize: '12px' }}>
          {new Date(timestamp * 1000).toLocaleString()}
        </Text>
      )
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 70,
      render: (isActive) => (
        <Badge 
          status={isActive ? 'success' : 'error'} 
          text={isActive ? '活跃' : '停用'}
        />
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedLog(record);
            setViewModalVisible(true);
          }}
        >
          查看
        </Button>
      )
    }
  ];

  // 组件挂载时加载数据
  useEffect(() => {
    if (account) {
      loadUserLogs();
      loadStats();
    }
  }, [account]);

  // 标签页切换处理
  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === 'user-logs' && account) {
      loadUserLogs();
    } else if (key === 'stats') {
      loadStats();
    }
  };

  // 表格分页处理
  const handleTableChange = (pagination, filters, sorter) => {
    if (activeTab === 'user-logs') {
      loadUserLogs(pagination.current, pagination.pageSize);
    }
  };

  return (
    <div>
      <Card title="链上日志查看器" style={{ marginBottom: 24 }}>
        <Tabs activeKey={activeTab} onChange={handleTabChange}>
          <TabPane 
            tab={<span><SearchOutlined />我的日志</span>} 
            key="user-logs"
          >
            {/* 筛选工具栏 */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Select
                    placeholder="选择日志级别"
                    value={filters.level}
                    onChange={(value) => setFilters(prev => ({ ...prev, level: value }))}
                    options={LOG_LEVEL_OPTIONS}
                    style={{ width: '100%' }}
                    allowClear
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="输入分类名称"
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    allowClear
                  />
                </Col>
                <Col span={6}>
                  <RangePicker
                    value={filters.dateRange}
                    onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates }))}
                    style={{ width: '100%' }}
                    placeholder={['开始时间', '结束时间']}
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="搜索关键词"
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    allowClear
                  />
                </Col>
              </Row>
              <Row style={{ marginTop: 12 }}>
                <Col>
                  <Space>
                    <Button
                      type="primary"
                      icon={<SearchOutlined />}
                      onClick={handleAdvancedSearch}
                      loading={loading}
                    >
                      搜索
                    </Button>
                    <Button
                      icon={<FilterOutlined />}
                      onClick={resetFilters}
                    >
                      重置
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => loadUserLogs()}
                      loading={loading}
                    >
                      刷新
                    </Button>
                    <Button
                      icon={<ExportOutlined />}
                      onClick={exportLogs}
                      disabled={logs.length === 0}
                    >
                      导出
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Card>

            {/* 日志表格 */}
            <Table
              columns={columns}
              dataSource={logs}
              rowKey={(record) => record.id || record.logId}
              loading={loading}
              pagination={{
                ...pagination,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`
              }}
              onChange={handleTableChange}
              scroll={{ x: 1000 }}
              size="small"
            />
          </TabPane>

          <TabPane 
            tab={<span><BarChartOutlined />统计信息</span>} 
            key="stats"
          >
            {/* 统计卡片 */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总日志数"
                    value={stats.globalStats?.totalLogs || 0}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="活跃日志"
                    value={stats.globalStats?.activeLogs || 0}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="总用户数"
                    value={stats.globalStats?.totalUsers || 0}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="分类数量"
                    value={stats.globalStats?.totalCategories || 0}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 每日统计 */}
            {stats.dailyStats && stats.dailyStats.length > 0 && (
              <Card title="近7天统计" style={{ marginBottom: 16 }}>
                <Table
                  dataSource={stats.dailyStats}
                  rowKey="date"
                  pagination={false}
                  size="small"
                  columns={[
                    { title: '日期', dataIndex: 'date', key: 'date' },
                    { title: '总日志', dataIndex: 'totalLogs', key: 'totalLogs' },
                    { title: '活跃日志', dataIndex: 'activeLogs', key: 'activeLogs' },
                    { title: '调试', dataIndex: 'debugLogs', key: 'debugLogs' },
                    { title: '信息', dataIndex: 'infoLogs', key: 'infoLogs' },
                    { title: '警告', dataIndex: 'warnLogs', key: 'warnLogs' },
                    { title: '错误', dataIndex: 'errorLogs', key: 'errorLogs' },
                    { title: '致命', dataIndex: 'fatalLogs', key: 'fatalLogs' }
                  ]}
                />
              </Card>
            )}

            <Button
              icon={<ReloadOutlined />}
              onClick={loadStats}
              loading={loading}
            >
              刷新统计
            </Button>
          </TabPane>
        </Tabs>
      </Card>

      {/* 日志详情Modal */}
      <Modal
        title="日志详情"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedLog && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>日志ID: </Text>
                    <Text code>#{selectedLog.logId}</Text>
                  </div>
                  <div>
                    <Text strong>级别: </Text>
                    <Tag color={LOG_LEVEL_COLORS[selectedLog.level]}>
                      {selectedLog.level}
                    </Tag>
                  </div>
                  <div>
                    <Text strong>分类: </Text>
                    <Tag color="blue">{selectedLog.category}</Tag>
                  </div>
                </Space>
              </Col>
              <Col span={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>创建者: </Text>
                    <Text code>{selectedLog.creator?.address || selectedLog.creator}</Text>
                  </div>
                  <div>
                    <Text strong>时间: </Text>
                    <Text>{new Date(selectedLog.timestamp * 1000).toLocaleString()}</Text>
                  </div>
                  <div>
                    <Text strong>状态: </Text>
                    <Badge 
                      status={selectedLog.isActive ? 'success' : 'error'} 
                      text={selectedLog.isActive ? '活跃' : '已停用'}
                    />
                  </div>
                </Space>
              </Col>
            </Row>

            <div style={{ marginBottom: 16 }}>
              <Text strong>消息内容:</Text>
              <Paragraph
                style={{ 
                  marginTop: 8, 
                  padding: 12, 
                  backgroundColor: '#f5f5f5', 
                  borderRadius: 6,
                  whiteSpace: 'pre-wrap'
                }}
              >
                {selectedLog.message}
              </Paragraph>
            </div>

            {selectedLog.metadata && (
              <div style={{ marginBottom: 16 }}>
                <Text strong>元数据:</Text>
                <Paragraph
                  style={{ 
                    marginTop: 8, 
                    padding: 12, 
                    backgroundColor: '#f5f5f5', 
                    borderRadius: 6,
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {selectedLog.metadata}
                </Paragraph>
              </div>
            )}

            <Row gutter={16}>
              <Col span={12}>
                <div>
                  <Text strong>区块号: </Text>
                  <Text code>{selectedLog.blockNumber}</Text>
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <Text strong>交易哈希: </Text>
                  <Text code style={{ fontSize: '12px' }}>
                    {selectedLog.transactionHash}
                  </Text>
                </div>
              </Col>
            </Row>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LogViewer;