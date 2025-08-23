import React, { useState, useEffect } from 'react';
import { useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';
import { Button, Modal, Card, Space, message, Tag, Alert, Select, Avatar, Dropdown, Menu, Divider } from 'antd';
import { WalletOutlined, DisconnectOutlined, ExclamationCircleOutlined, UserOutlined, SwapOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons';

const { Option } = Select;

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

// 网络配置
const NETWORKS = {
  1: {
    name: 'Ethereum 主网',
    shortName: 'ETH 主网',
    symbol: 'ETH',
    color: '#627eea',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    blockExplorer: 'https://etherscan.io'
  },
  5: {
    name: 'Goerli 测试网',
    shortName: 'Goerli',
    symbol: 'GoerliETH',
    color: '#f6c343',
    rpcUrl: 'https://goerli.infura.io/v3/',
    blockExplorer: 'https://goerli.etherscan.io'
  },
  11155111: {
    name: 'Sepolia 测试网',
    shortName: 'Sepolia',
    symbol: 'SepoliaETH',
    color: '#ff6b6b',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    blockExplorer: 'https://sepolia.etherscan.io'
  },
  1337: {
    name: '本地开发链',
    shortName: '本地链',
    symbol: 'LocalETH',
    color: '#95de64',
    rpcUrl: 'http://localhost:8545',
    blockExplorer: ''
  }
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

  const loadBalance = async () => {
    if (library && account) {
      try {
        const balance = await library.getBalance(account);
        setBalance(parseFloat(library.utils.formatEther(balance)).toFixed(4));
      } catch (error) {
        console.error('获取余额失败:', error);
        setBalance('0');
      }
    }
  };

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
      setBalance('0');
      message.success('钱包已断开连接');
    } catch (error) {
      console.error('断开连接失败:', error);
      message.error('断开连接失败');
    }
  };

  const switchNetwork = async (targetChainId) => {
    if (!window.ethereum) return;

    const chainIdHex = `0x${targetChainId.toString(16)}`;
    const network = NETWORKS[targetChainId];

    try {
      // 尝试切换到目标网络
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
      message.success(`已切换到 ${network.name}`);
    } catch (switchError) {
      // 如果网络不存在，尝试添加网络
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: chainIdHex,
                chainName: network.name,
                nativeCurrency: {
                  name: network.symbol,
                  symbol: network.symbol,
                  decimals: 18,
                },
                rpcUrls: [network.rpcUrl],
                blockExplorerUrls: network.blockExplorer ? [network.blockExplorer] : [],
              },
            ],
          });
          message.success(`已添加并切换到 ${network.name}`);
        } catch (addError) {
          console.error('添加网络失败:', addError);
          message.error('添加网络失败');
        }
      } else {
        console.error('切换网络失败:', switchError);
        message.error('切换网络失败');
      }
    }
  };

  const copyAddress = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      setCopied(true);
      message.success('地址已复制');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getCurrentNetwork = () => {
    return NETWORKS[chainId] || {
      name: `未知网络 (${chainId})`,
      shortName: `Chain ${chainId}`,
      color: '#999999'
    };
  };

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isMetaMaskInstalled = () => {
    return typeof window.ethereum !== 'undefined';
  };

  // 生成用户头像（基于地址的简单头像）
  const generateAvatar = (address) => {
    if (!address) return null;
    
    const colors = [
      '#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#1890ff',
      '#722ed1', '#eb2f96', '#fa541c', '#13c2c2', '#52c41a'
    ];
    
    const index = parseInt(address.slice(2, 4), 16) % colors.length;
    const color = colors[index];
    const initial = address.slice(2, 4).toUpperCase();
    
    return (
      <Avatar 
        style={{ 
          backgroundColor: color, 
          fontSize: '12px',
          fontWeight: 'bold'
        }} 
        size={32}
      >
        {initial}
      </Avatar>
    );
  };

  // 连接成功后的钱包信息展示
  if (active && account) {
    const currentNetwork = getCurrentNetwork();
    
    const networkMenu = (
      <Menu onClick={({ key }) => switchNetwork(parseInt(key))}>
        <Menu.ItemGroup title="主网络">
          <Menu.Item 
            key="1" 
            disabled={chainId === 1}
            style={{ color: NETWORKS[1].color }}
          >
            <Space>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: NETWORKS[1].color }} />
              {NETWORKS[1].name}
            </Space>
          </Menu.Item>
        </Menu.ItemGroup>
        
        <Menu.Divider />
        
        <Menu.ItemGroup title="测试网络">
          <Menu.Item 
            key="5" 
            disabled={chainId === 5}
            style={{ color: NETWORKS[5].color }}
          >
            <Space>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: NETWORKS[5].color }} />
              {NETWORKS[5].name}
            </Space>
          </Menu.Item>
          <Menu.Item 
            key="11155111" 
            disabled={chainId === 11155111}
            style={{ color: NETWORKS[11155111].color }}
          >
            <Space>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: NETWORKS[11155111].color }} />
              {NETWORKS[11155111].name}
            </Space>
          </Menu.Item>
        </Menu.ItemGroup>
        
        <Menu.Divider />
        
        <Menu.ItemGroup title="开发网络">
          <Menu.Item 
            key="1337" 
            disabled={chainId === 1337}
            style={{ color: NETWORKS[1337].color }}
          >
            <Space>
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: NETWORKS[1337].color }} />
              {NETWORKS[1337].name}
            </Space>
          </Menu.Item>
        </Menu.ItemGroup>
      </Menu>
    );

    const walletMenu = (
      <Menu>
        <Menu.Item key="copy" onClick={copyAddress} icon={copied ? <CheckOutlined /> : <CopyOutlined />}>
          {copied ? '已复制地址' : '复制地址'}
        </Menu.Item>
        <Menu.Item key="explorer" onClick={() => {
          if (currentNetwork.blockExplorer) {
            window.open(`${currentNetwork.blockExplorer}/address/${account}`, '_blank');
          }
        }} disabled={!currentNetwork.blockExplorer}>
          在区块浏览器中查看
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item key="disconnect" onClick={disconnect} icon={<DisconnectOutlined />} danger>
          断开连接
        </Menu.Item>
      </Menu>
    );

    return (
      <div className="wallet-connected">
        <Space size="middle">
          {/* 网络选择器 */}
          <Dropdown overlay={networkMenu} trigger={['click']} placement="bottomRight">
            <Button 
              type="default" 
              size="small"
              style={{ 
                borderColor: currentNetwork.color,
                color: currentNetwork.color,
                fontWeight: '500'
              }}
              icon={<SwapOutlined />}
            >
              {currentNetwork.shortName}
            </Button>
          </Dropdown>
          
          {/* 余额显示 */}
          <div className="wallet-balance">
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>余额</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#262626' }}>
              {balance} {currentNetwork.symbol}
            </div>
          </div>
          
          {/* 用户头像和地址 */}
          <Dropdown overlay={walletMenu} trigger={['click']} placement="bottomRight">
            <div className="wallet-user" style={{ cursor: 'pointer' }}>
              <Space>
                {generateAvatar(account)}
                <div>
                  <div style={{ fontSize: '12px', color: '#8c8c8c' }}>钱包地址</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#262626', fontFamily: 'monospace' }}>
                    {formatAddress(account)}
                  </div>
                </div>
              </Space>
            </div>
          </Dropdown>
        </Space>
      </div>
    );
  }

  // 未连接状态
  return (
    <>
      <Button
        icon={<WalletOutlined />}
        onClick={() => setIsModalVisible(true)}
        type="primary"
        danger={!!connectionError}
        size="large"
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
        width={500}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
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
                    style={{ color: '#1890ff', textDecoration: 'none' }}
                  >
                    https://metamask.io/download/
                  </a>
                </div>
              }
              type="warning"
              showIcon
            />
          )}

          {connectionError && (
            <Alert
              message="连接失败"
              description={connectionError}
              type="error"
              showIcon
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
              opacity: isMetaMaskInstalled() ? 1 : 0.6,
              border: '2px solid #f0f0f0',
              borderRadius: '12px'
            }}
            bodyStyle={{ padding: '24px' }}
            loading={connecting}
          >
            <Space size="large">
              <Avatar size={48} style={{ backgroundColor: '#f6851b' }}>
                <WalletOutlined style={{ fontSize: '24px' }} />
              </Avatar>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>MetaMask</div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                  {isMetaMaskInstalled() 
                    ? '连接到您的 MetaMask 钱包' 
                    : '请先安装 MetaMask'
                  }
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  最受欢迎的以太坊钱包
                </div>
              </div>
            </Space>
          </Card>
          
          <div style={{ fontSize: '12px', color: '#666', textAlign: 'center', lineHeight: '1.5' }}>
            <div style={{ marginBottom: '8px', fontWeight: '500' }}>连接问题排查：</div>
            <Space direction="vertical" size="small">
              <div>• 确保MetaMask已解锁</div>
              <div>• 检查网络设置是否正确</div>
              <div>• 尝试刷新页面重新连接</div>
              <div>• 确保允许网站访问MetaMask</div>
            </Space>
          </div>
        </Space>
      </Modal>
    </>
  );
};

export default WalletConnection;
