import React from 'react';
import { Progress, Modal, Space, Typography } from 'antd';
import { LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const ProgressBar = ({ visible, progress, status, message, onCancel }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'active':
        return <LoadingOutlined spin style={{ color: '#1890ff' }} />;
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'exception':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return '#52c41a';
      case 'exception':
        return '#ff4d4f';
      default:
        return '#1890ff';
    }
  };

  const getProgressStatus = () => {
    switch (status) {
      case 'success':
        return 'success';
      case 'exception':
        return 'exception';
      default:
        return 'active';
    }
  };

  return (
    <Modal
      title="数据上链进度"
      open={visible}
      footer={null}
      onCancel={status !== 'active' ? onCancel : undefined}
      closable={status !== 'active'}
      maskClosable={false}
      width={500}
      centered
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Progress
          percent={progress}
          status={getProgressStatus()}
          strokeColor={getStatusColor()}
          size="default"
          showInfo={true}
        />
        
        <Space align="center" size="medium">
          {getStatusIcon()}
          <Text 
            style={{ 
              fontSize: '14px',
              color: status === 'exception' ? '#ff4d4f' : '#666'
            }}
          >
            {message}
          </Text>
        </Space>

        {status === 'active' && (
          <div style={{ 
            background: '#f6ffed', 
            border: '1px solid #b7eb8f',
            borderRadius: '6px',
            padding: '12px',
            fontSize: '12px',
            color: '#389e0d'
          }}>
            <div>📝 正在处理您的请求...</div>
            <div>⏳ 这可能需要几分钟时间，请耐心等待</div>
            <div>🔄 请勿关闭页面或刷新浏览器</div>
          </div>
        )}

        {status === 'success' && (
          <div style={{ 
            background: '#f6ffed', 
            border: '1px solid #b7eb8f',
            borderRadius: '6px',
            padding: '12px',
            fontSize: '12px',
            color: '#389e0d'
          }}>
            ✅ 数据已成功上链！您可以在下方的记录表格中查看最新数据。
          </div>
        )}

        {status === 'exception' && (
          <div style={{ 
            background: '#fff2f0', 
            border: '1px solid #ffccc7',
            borderRadius: '6px',
            padding: '12px',
            fontSize: '12px',
            color: '#cf1322'
          }}>
            ❌ 上链失败，请检查网络连接和钱包状态后重试。
          </div>
        )}
      </Space>
    </Modal>
  );
};

export default ProgressBar;
