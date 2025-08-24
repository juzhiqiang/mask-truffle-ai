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
          extra="备注信息会尝试写入区块链交易数据。如果失败，将保存在本地记录中。"
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