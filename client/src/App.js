            <TabPane tab={<span><SearchOutlined />日志查看器</span>} key="log-viewer">
              <LogViewer account={account} />
            </TabPane>
          </Tabs>
        </Card>

        {/* 记录展示区域 - 独立于标签页 */}
        <Row gutter={24}>
          <Col span={24}>
            <Card 
              title={<span><HistoryOutlined /> 交易记录</span>}
              extra={
                <Badge 
                  count={filteredTransactionRecords.length} 
                  showZero 
                  style={{ backgroundColor: '#52c41a' }} 
                />
              }
            >
              <div style={{ marginBottom: 16 }}>
                <Input.Search
                  placeholder="搜索交易记录（地址、哈希、金额、状态等）"
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
                rowKey="id"
                pagination={{ pageSize: 10, size: 'small' }}
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
                  <Paragraph><strong>类型:</strong> {
                    selectedRecord.dataType === 'enhanced-log' ? 
                    `日志 [${selectedRecord.level}]` : 
                    (selectedRecord.token || selectedRecord.dataType)
                  }</Paragraph>
                  <Paragraph><strong>状态:</strong> 
                    <Badge 
                      status={selectedRecord.status === 'success' ? 'success' : 'error'} 
                      text={selectedRecord.status === 'success' ? '成功' : '失败'} 
                    />
                  </Paragraph>
                  <Paragraph><strong>时间:</strong> {selectedRecord.date}</Paragraph>
                </Col>
                <Col span={12}>
                  {selectedRecord.dataType === 'enhanced-log' ? (
                    <>
                      <Paragraph><strong>日志ID:</strong> #{selectedRecord.logId}</Paragraph>
                      <Paragraph><strong>分类:</strong> {selectedRecord.category}</Paragraph>
                      <Paragraph><strong>合约地址:</strong> {selectedRecord.contractAddress?.slice(0, 10)}...{selectedRecord.contractAddress?.slice(-8)}</Paragraph>
                    </>
                  ) : (
                    <>
                      {selectedRecord.amount && (
                        <Paragraph><strong>金额:</strong> {selectedRecord.amount} {selectedRecord.token}</Paragraph>
                      )}
                      {selectedRecord.toAddress && (
                        <Paragraph><strong>接收地址:</strong> {selectedRecord.toAddress}</Paragraph>
                      )}
                      {selectedRecord.fromAddress && (
                        <Paragraph><strong>发送地址:</strong> {selectedRecord.fromAddress}</Paragraph>
                      )}
                    </>
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
              
              {/* 增强日志特有信息 */}
              {selectedRecord.dataType === 'enhanced-log' && (
                <>
                  <Divider>日志内容</Divider>
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>消息:</Text>
                    <Paragraph
                      style={{ 
                        marginTop: 8, 
                        padding: 12, 
                        backgroundColor: '#f5f5f5', 
                        borderRadius: 6,
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {selectedRecord.message}
                    </Paragraph>
                  </div>
                  
                  {selectedRecord.metadata && (
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
                        {selectedRecord.metadata}
                      </Paragraph>
                    </div>
                  )}
                </>
              )}

              {/* 转账记录的Input Data */}
              {selectedRecord.dataType === 'transfer' && (
                <Paragraph>
                  <strong>Input Data:</strong>
                  <br />
                  <Text code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '12px' }}>
                    {selectedRecord.inputData || '0x'}
                  </Text>
                </Paragraph>
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
              {selectedRecord.dataType !== 'transfer' && selectedRecord.dataType !== 'enhanced-log' && selectedRecord.customData && typeof selectedRecord.customData === 'object' && (
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
              {selectedRecord.dataType !== 'transfer' && selectedRecord.dataType !== 'enhanced-log' && selectedRecord.customData && typeof selectedRecord.customData === 'string' && (
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
          Mask Truffle AI ©2024 - 去中心化数据存储与转账平台 | 增强日志上链功能
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