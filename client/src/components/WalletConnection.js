import React, { useState, useEffect } from 'react';
import { useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';
import { Button, Modal, Card, Space, message, Tag } from 'antd';
import { WalletOutlined, DisconnectOutlined } from '@ant-design/icons';

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

  useEffect(() => {
    if (account) {
      onAccountChange(account);
    }
  }, [account, onAccountChange]);

  useEffect(() => {
    // 自动连接之前连接过的钱包
    const isConnected = window.localStorage.getItem('isWalletConnected');
    if (isConnected === 'true' && !active) {
      connectMetaMask();
    }
  }, []);

  const connectMetaMask = async () => {
    setConnecting(true);
    try {
      await activate(injectedConnector);
      window.localStorage.setItem('isWalletConnected', 'true');
      message.success('钱包连接成功');
      setIsModalVisible(false);
    } catch (error) {
      console.error('连接钱包失败:', error);
      message.error('连接钱包失败');
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    deactivate();
    window.localStorage.setItem('isWalletConnected', 'false');
    onAccountChange('');
    message.success('钱包已断开连接');
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
      >
        连接钱包
      </Button>
      
      <Modal
        title="连接钱包"
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={400}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Card
            hoverable
            onClick={connectMetaMask}
            style={{ cursor: 'pointer' }}
            bodyStyle={{ padding: '20px' }}
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
                  连接到您的 MetaMask 钱包
                </div>
              </div>
            </Space>
          </Card>
          
          {error && (
            <div style={{ color: 'red', fontSize: '12px' }}>
              连接失败: {error.message}
            </div>
          )}
          
          <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
            请确保已安装 MetaMask 浏览器扩展
          </div>
        </Space>
      </Modal>
    </>
  );
};

export default WalletConnection;
