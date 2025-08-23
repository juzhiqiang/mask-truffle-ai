import React, { useState, useEffect } from 'react';
import { useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';
import { Button, Modal, Card, Space, message, Tag, Alert } from 'antd';
import { WalletOutlined, DisconnectOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const injectedConnector = new InjectedConnector({
  supportedChainIds: [
    1, // Mainnet
    3, // Ropsten
    4, // Rinkeby
    5, // Goerli
    42, // Kovan
    11155111, // Sepolia
    1337, // Local
  ],
});

const WalletConnection = ({ onAccountChange }) => {
  const { activate, deactivate, active, account, library, chainId, error } = useWeb3React();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');

  useEffect(() => {
    if (account && active) {
      onAccountChange(account);
      setConnectionError('');
    } else if (!active) {
      onAccountChange('');
    }
  }, [account, active, onAccountChange]);

  useEffect(() => {
    // 处理Web3React的错误
    if (error) {
      setConnectionError(getErrorMessage(error));
      setConnecting(false);
    }
  }, [error]);

  useEffect(() => {
    // 自动连接之前连接过的钱包
    const isConnected = window.localStorage.getItem('isWalletConnected');
    if (isConnected === 'true' && !active && !error) {
      connectMetaMask();
    }
  }, []);

  const getErrorMessage = (error) => {
    if (error.name === 'UnsupportedChainIdError') {
      return '不支持的网络，请切换到支持的网络';
    } else if (error.name === 'UserRejectedRequestError') {
      return '用户拒绝了连接请求';
    } else if (error.name === 'NoEthereumProviderError') {
      return '未检测到MetaMask，请安装MetaMask扩展';
    } else if (error.message?.includes('No Ethereum provider')) {
      return '未检测到以太坊钱包，请安装MetaMask';
    } else {
      return error.message || '钱包连接失败';
    }
  };

  const connectMetaMask = async () => {
    // 检查是否安装了MetaMask
    if (!window.ethereum) {
      setConnectionError('未检测到MetaMask，请先安装MetaMask浏览器扩展');
      message.error('未检测到MetaMask，请先安装MetaMask浏览器扩展');
      return;
    }

    setConnecting(true);
    setConnectionError('');

    try {
      // 先清除之前的错误状态
      if (error) {
        deactivate();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await activate(injectedConnector);
      
      // 等待连接状态更新
      setTimeout(() => {
        if (active && account) {
          window.localStorage.setItem('isWalletConnected', 'true');
          message.success('钱包连接成功');
          setIsModalVisible(false);
        } else {
          setConnectionError('连接失败，请重试');
          message.error('连接失败，请重试');
        }
        setConnecting(false);
      }, 1000);

    } catch (error) {
      console.error('连接钱包失败:', error);
      const errorMsg = getErrorMessage(error);
      setConnectionError(errorMsg);
      message.error(errorMsg);
      setConnecting(false);
    }
  };

  const disconnect = () => {
    try {
      deactivate();
      window.localStorage.setItem('isWalletConnected', 'false');
      onAccountChange('');
      setConnectionError('');
      message.success('钱包已断开连接');
    } catch (error) {
      console.error('断开连接失败:', error);
      message.error('断开连接失败');
    }
  };

  const getChainName = (chainId) => {
    const chains = {
      1: 'Mainnet',
      3: 'Ropsten',
      4: 'Rinkeby',
      5: 'Goerli',
      42: 'Kovan',
      11155111: 'Sepolia',
      1337: 'Local'
    };
    return chains[chainId] || `Chain ${chainId}`;
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 检查MetaMask是否已安装
  const isMetaMaskInstalled = () => {
    return typeof window.ethereum !== 'undefined';
  };

  if (active && account) {
    return (
      <Space>
        <Tag color="green">
          {getChainName(chainId)}
        </Tag>
        <Tag color="blue">
          {formatAddress(account)}
        </Tag>
        <Button
          icon={<DisconnectOutlined />}
          onClick={disconnect}
          type="text"
          style={{ color: 'white' }}
        >
          断开连接
        </Button>
      </Space>
    );
  }

  return (
    <>
      <Button
        icon={<WalletOutlined />}
        onClick={() => setIsModalVisible(true)}
        type="primary"
        danger={!!connectionError}
      >
        {connectionError ? '连接失败' : '连接钱包'}
      </Button>
      
      <Modal
        title="连接钱包"
        visible={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setConnectionError('');
        }}
        footer={null}
        width={400}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          {!isMetaMaskInstalled() && (
            <Alert
              message="未检测到MetaMask"
              description={
                <div>
                  请先安装MetaMask浏览器扩展：
                  <br />
                  <a 
                    href="https://metamask.io/download/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    https://metamask.io/download/
                  </a>
                </div>
              }
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {connectionError && (
            <Alert
              message="连接失败"
              description={connectionError}
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
              action={
                <Button 
                  size="small" 
                  onClick={() => setConnectionError('')}
                >
                  关闭
                </Button>
              }
            />
          )}

          <Card
            hoverable
            onClick={isMetaMaskInstalled() ? connectMetaMask : null}
            style={{ 
              cursor: isMetaMaskInstalled() ? 'pointer' : 'not-allowed',
              opacity: isMetaMaskInstalled() ? 1 : 0.6
            }}
            bodyStyle={{ padding: '20px' }}
            loading={connecting}
          >
            <Space>
              <img 
                src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iMTYiIGZpbGw9IiNGNjg1MUIiLz4KPHBhdGggZD0iTTI0LjUgOC41TDIwIDEyTDE4IDE0TDE0IDE2TDE2IDE4TDE4IDE2TDIwIDEyTDI0LjUgOC41WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+" 
                alt="MetaMask" 
                width={32} 
                height={32}
              />
              <div>
                <div style={{ fontWeight: 'bold' }}>MetaMask</div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {isMetaMaskInstalled() 
                    ? '连接到您的 MetaMask 钱包' 
                    : '请先安装 MetaMask'
                  }
                </div>
              </div>
            </Space>
          </Card>
          
          <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
            <Space direction="vertical">
              <div>连接问题排查：</div>
              <div>1. 确保MetaMask已解锁</div>
              <div>2. 检查网络设置是否正确</div>
              <div>3. 尝试刷新页面重新连接</div>
            </Space>
          </div>
        </Space>
      </Modal>
    </>
  );
};

export default WalletConnection;
