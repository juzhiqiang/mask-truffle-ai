                </Tooltip>
              ) : <span style={{ color: '#ccc' }}>无</span>;
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
          title: '自定义数据',
          dataIndex: 'customData',
          key: 'customData',
          width: 100,
          render: (customData, record) => {
            const hasCustomData = customData && Object.keys(customData).length > 0;
            const hasMemo = record.memo && record.memo.trim().length > 0;
            
            if (hasCustomData || hasMemo) {
              return (
                <Tooltip title="点击查看自定义数据和备注">
                  <Button 
                    type="link" 
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => showCustomDataModal({
                      ...customData,
                      ...(hasMemo && { memo: record.memo })
                    }, '转账自定义数据')}
                  >
                    查看({(hasCustomData ? Object.keys(customData).length : 0) + (hasMemo ? 1 : 0)})
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
                  <h3>直接钱包转账（支持自定义数据）</h3>
                  <p className="tab-description">使用连接的钱包直接发送ETH，可添加自定义数据到交易中</p>
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
                  <h3>系统日志数据上链（支持自定义数据）</h3>
                  <p className="tab-description">将日志数据和自定义信息永久存储到区块链合约中</p>
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
                  <h3>USDT代币转账（支持自定义数据）</h3>
                  <p className="tab-description">发送USDT代币到指定地址，可添加自定义数据记录</p>
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
