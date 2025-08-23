import React, { useState, useEffect } from 'react';
import { useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';
import { Button, Modal, Card, Space, message, Alert, Avatar, Dropdown, Menu } from 'antd';
import { WalletOutlined, DisconnectOutlined, SwapOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { ethers } from 'ethers';

const injectedConnector = new InjectedConnector({
  supportedChainIds: [1, 5, 11155111, 1337],
});

const NETWORKS = {
  1: { name: 'Ethereum 主网', shortName: 'ETH 主网', symbol: 'ETH', color: '#627eea', blockExplorer: 'https://etherscan.io' },
  5: { name: 'Goerli 测试网', shortName: 'Goerli', symbol: 'GoerliETH', color: '#f6c343', blockExplorer: 'https://goerli.etherscan.io' },
  11155111: { name: 'Sepolia 测试网', shortName: 'Sepolia', symbol: 'SepoliaETH', color: '#ff6b6b', blockExplorer: 'https://sepolia.etherscan.io' },
  1337: { name: '本地开发链', shortName: '本地链', symbol: 'LocalETH', color: '#95de64', blockExplorer: '' }
};

const WalletConnection = ({ onAccountChange }) => {
  const { activate, deactivate, active, account, library, chainId, error } = useWeb3React();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [balance, setBalance] = useState('0');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (account && active) {
      onAccountChange(account);
      setConnectionError('');
      loadBalance();
    } else if (!active) {
      onAccountChange('');
      setBalance('0');
    }
  }, [account, active, onAccountChange, chainId]);

  const loadBalance = async () => {
    if (library && account) {
      try {
        const balance = await library.getBalance(account);
        setBalance(parseFloat(ethers.utils.formatEther(balance)).toFixed(4));
      } catch (error) {
        setBalance('0');
      }
    }
  };

  const connectMetaMask = async () => {
    if (!window.ethereum) {
      message.error('未检测到MetaMask，请先安装MetaMask浏览器扩展');
      return;
    }
    setConnecting(true);
    try {
      await activate(injectedConnector);
      message.success('钱包连接成功');
      setIsModalVisible(false);
    } catch (error) {
      message.error('连接失败，请重试');
    }
    setConnecting(false);
  };

  const disconnect = () => {
    deactivate();
    onAccountChange('');
    setBalance('0');
    message.success('钱包已断开连接');
  };

  const generateAvatar = (address) => {
    const colors = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#1890ff'];
    const index = parseInt(address.slice(2, 4), 16) % colors.length;
    return <Avatar style={{ backgroundColor: colors[index] }} size={32}>{address.slice(2, 4).toUpperCase()}</Avatar>;
  };

  const formatAddress = (address) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  if (active && account) {
    const currentNetwork = NETWORKS[chainId] || { shortName: `Chain ${chainId}`, color: '#999' };
    return (
      <Space size="middle">
        <Button type="default" size="small" style={{ borderColor: currentNetwork.color, color: currentNetwork.color }}>
          {currentNetwork.shortName}
        </Button>
        <div className="wallet-balance">
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>余额</div>
          <div style={{ fontSize: '14px', fontWeight: '600' }}>{balance} {currentNetwork.symbol}</div>
        </div>
        <Dropdown overlay={
          <Menu>
            <Menu.Item onClick={() => navigator.clipboard.writeText(account)}>复制地址</Menu.Item>
            <Menu.Item onClick={disconnect} danger>断开连接</Menu.Item>
          </Menu>
        }>
          <div className="wallet-user" style={{ cursor: 'pointer' }}>
            <Space>
              {generateAvatar(account)}
              <div>
                <div style={{ fontSize: '12px', color: '#8c8c8c' }}>钱包地址</div>
                <div style={{ fontSize: '14px', fontWeight: '600', fontFamily: 'monospace' }}>
                  {formatAddress(account)}
                </div>
              </div>
            </Space>
          </div>
        </Dropdown>
      </Space>
    );
  }

  return (
    <>
      <Button icon={<WalletOutlined />} onClick={() => setIsModalVisible(true)} type="primary" size="large">
        连接钱包
      </Button>
      <Modal title="连接钱包" visible={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null}>
        <Card hoverable onClick={connectMetaMask} loading={connecting}>
          <Space size="large">
            <Avatar size={48} style={{ backgroundColor: '#f6851b' }}>
              <WalletOutlined style={{ fontSize: '24px' }} />
            </Avatar>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>MetaMask</div>
              <div style={{ fontSize: '14px', color: '#666' }}>连接到您的 MetaMask 钱包</div>
            </div>
          </Space>
        </Card>
      </Modal>
    </>
  );
};

export default WalletConnection;
