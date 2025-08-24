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

  useEffect(() => {
    // 处理Web3React的错误
    if (error) {
      console.log('Web3React error:', error);
      handleConnectionError(error);
      setConnecting(false);
    }
  }, [error]);

  const loadBalance = async () => {
    if (library && account) {
      try {
        const balance = await library.getBalance(account);
        setBalance(parseFloat(ethers.utils.formatEther(balance)).toFixed(4));
      } catch (error) {
        console.error('获取余额失败:', error);
        setBalance('0');
      }
    }
  };

  const handleConnectionError = (error) => {
    let errorMessage = '';
    
    if (error.name === 'UnsupportedChainIdError') {
      errorMessage = '不支持的网络，请切换到支持的网络';
    } else if (error.name === 'UserRejectedRequestError') {
      errorMessage = '用户拒绝了连接请求';
    } else if (error.name === 'NoEthereumProviderError') {
      errorMessage = '未检测到MetaMask，请安装MetaMask扩展';
    } else if (error.message?.includes('User rejected') || error.message?.includes('User denied')) {
      errorMessage = '用户拒绝了连接请求';
    } else if (error.message?.includes('No Ethereum provider')) {
      errorMessage = '未检测到以太坊钱包，请安装MetaMask';
    } else {
      errorMessage = error.message || '钱包连接失败';
    }
    
    setConnectionError(errorMessage);
    message.error('连接失败: ' + errorMessage);
  };

  const connectMetaMask = async () => {
    if (!window.ethereum) {
      const errorMsg = '未检测到MetaMask，请先安装MetaMask浏览器扩展';
      setConnectionError(errorMsg);
      message.error(errorMsg);
      return;
    }

    setConnecting(true);
    setConnectionError('');

    try {
      // 清除之前的错误状态
      if (error) {
        deactivate();
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // 先尝试请求账户权限
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // 然后激活连接器
      await activate(injectedConnector);
      
      // 等待连接状态更新
      setTimeout(() => {
        if (active && account) {
          message.success('钱包连接成功');
          setIsModalVisible(false);
        }
        setConnecting(false);
      }, 1000);

    } catch (error) {
      console.error('连接钱包失败:', error);
      setConnecting(false);
      
      // 处理具体的连接错误
      if (error.code === 4001 || error.message?.includes('User rejected')) {
        const errorMsg = '用户拒绝了连接请求';
        setConnectionError(errorMsg);
        message.error('连接失败: ' + errorMsg);
      } else if (error.code === -32002) {
        const errorMsg = 'MetaMask已有待处理的连接请求，请在MetaMask中处理';
        setConnectionError(errorMsg);
        message.error('连接失败: ' + errorMsg);
      } else {
        handleConnectionError(error);
      }
    }
  };

  const disconnect = () => {
    try {
      deactivate();
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
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
      message.success(`已切换到 ${network.name}`);
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: chainIdHex,
              chainName: network.name,
              nativeCurrency: {
                name: network.symbol,
                symbol: network.symbol,
                decimals: 18,
              },
              rpcUrls: ['http://localhost:8545'],
              blockExplorerUrls: network.blockExplorer ? [network.blockExplorer] : [],
            }],
          });
          message.success(`已添加并切换到 ${network.name}`);
        } catch (addError) {
          console.error('添加网络失败:', addError);
          if (addError.code === 4001) {
            message.error('用户拒绝了添加网络请求');
          } else {
            message.error('添加网络失败');
          }
        }
      } else if (switchError.code === 4001) {
        message.error('用户拒绝了切换网络请求');
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

  const generateAvatar = (address) => {
    if (!address) return null;
    
    const colors = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#1890ff'];
    const index = parseInt(address.slice(2, 4), 16) % colors.length;
    const color = colors[index];
    const initial = address.slice(2, 4).toUpperCase();
    
    return (
      <Avatar style={{ backgroundColor: color, fontSize: '12px', fontWeight: 'bold' }} size={32}>
        {initial}
      </Avatar>
    );
  };

  const formatAddress = (address) => `${address.slice(0, 6)}...${address.slice(-4)}`;
  const isMetaMaskInstalled = () => typeof window.ethereum !== 'undefined';

  // 连接成功后的钱包信息展示
  if (active && account) {
    const currentNetwork = NETWORKS[chainId] || { shortName: `Chain ${chainId}`, color: '#999', symbol: 'ETH' };
    
    const networkMenuItems = [
      {
        key: 'main',
        label: '主网络',
        type: 'group',
        children: [
          {
            key: '1',
            label: (
              <Space>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: NETWORKS[1].color }} />
                {NETWORKS[1].name}
              </Space>
            ),
            disabled: chainId === 1,
            onClick: () => switchNetwork(1)
          }
        ]
      },
      {
        key: 'test',
        label: '测试网络',
        type: 'group',
        children: [
          {
            key: '5',
            label: (
              <Space>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: NETWORKS[5].color }} />
                {NETWORKS[5].name}
              </Space>
            ),
            disabled: chainId === 5,
            onClick: () => switchNetwork(5)
          },
          {
            key: '11155111',
            label: (
              <Space>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: NETWORKS[11155111].color }} />
                {NETWORKS[11155111].name}
              </Space>
            ),
            disabled: chainId === 11155111,
            onClick: () => switchNetwork(11155111)
          }
        ]
      },
      {
        key: 'dev',
        label: '开发网络',
        type: 'group',
        children: [
          {
            key: '1337',
            label: (
              <Space>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: NETWORKS[1337].color }} />
                {NETWORKS[1337].name}
              </Space>
            ),
            disabled: chainId === 1337,
            onClick: () => switchNetwork(1337)
          }
        ]
      }
    ];

    const walletMenuItems = [
      {
        key: 'copy',
        label: copied ? '已复制地址' : '复制地址',
        icon: copied ? <CheckOutlined /> : <CopyOutlined />,
        onClick: copyAddress
      },
      {
        key: 'explorer',
        label: '在区块浏览器中查看',
        disabled: !currentNetwork.blockExplorer,
        onClick: () => {
          if (currentNetwork.blockExplorer) {
            window.open(`${currentNetwork.blockExplorer}/address/${account}`, '_blank');
          }
        }
      },
      {
        type: 'divider'
      },
      {
        key: 'disconnect',
        label: '断开连接',
        icon: <DisconnectOutlined />,
        danger: true,
        onClick: disconnect
      }
    ];

    return (
      <div className="wallet-connected">
        <Space size="middle">
          <Dropdown
            menu={{ items: networkMenuItems }}
            trigger={['click']}
          >
            <Button 
              type="default" 
              size="small" 
              style={{ borderColor: currentNetwork.color, color: currentNetwork.color }} 
              icon={<SwapOutlined />}
            >
              {currentNetwork.shortName}
            </Button>
          </Dropdown>
          
          <div className="wallet-balance">
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>余额</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#262626' }}>
              {balance} {currentNetwork.symbol}
            </div>
          </div>
          
          <Dropdown
            menu={{ items: walletMenuItems }}
            trigger={['click']}
          >
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

  // 未连接状态 - 只显示连接按钮，由用户手动触发
  return (
    <>
      <Button
        icon={<WalletOutlined />}
        onClick={() => setIsModalVisible(true)}
        type="primary"
        size="large"
        danger={!!connectionError}
      >
        {connectionError ? '连接失败' : '连接钱包'}
      </Button>
      
      <Modal
        title="连接钱包"
        open={isModalVisible}
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
            styles={{ body: { padding: '24px' } }}
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
            <div style={{ marginBottom: '8px', fontWeight: '500' }}>首次使用说明：</div>
            <Space direction="vertical" size="small">
              <div>• 点击上方卡片开始连接</div>
              <div>• 在MetaMask弹窗中点击"连接"</div>
              <div>• 选择要连接的账户</div>
              <div>• 连接成功后可切换网络</div>
            </Space>
          </div>
        </Space>
      </Modal>
    </>
  );
};

export default WalletConnection;