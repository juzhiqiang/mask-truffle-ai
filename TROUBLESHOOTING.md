# 故障排除指南 - Troubleshooting Guide

本文档提供了 Mask Truffle AI 项目常见问题的解决方案。

## 🔧 钱包连接问题

### 问题1：钱包连接失败但提示连接成功

**症状**：点击连接钱包后提示成功，但实际上钱包未连接

**原因**：错误处理逻辑不完善，未正确检查连接状态

**解决方案**：
1. 确保 MetaMask 已安装并解锁
2. 检查浏览器控制台是否有错误信息
3. 刷新页面重新连接
4. 确保 MetaMask 中至少有一个账户

```javascript
// 检查 MetaMask 是否已安装
if (typeof window.ethereum === 'undefined') {
  console.error('请安装 MetaMask');
}

// 检查账户连接状态
const accounts = await window.ethereum.request({ method: 'eth_accounts' });
if (accounts.length === 0) {
  console.log('未连接任何账户');
}
```

### 问题2：不支持的网络错误

**症状**：连接钱包时提示"不支持的网络"

**解决方案**：
1. 在 MetaMask 中切换到支持的网络（主网、Sepolia、本地网络）
2. 或者在项目中添加更多支持的网络ID

```javascript
// 在 WalletConnection.js 中添加更多支持的网络
const injectedConnector = new InjectedConnector({
  supportedChainIds: [
    1,        // Mainnet
    5,        // Goerli
    11155111, // Sepolia
    1337,     // Local
    // 添加更多网络ID
  ],
});
```

## 🔗 合约部署问题

### 问题3：合约部署失败

**症状**：运行 `npm run migrate` 时出错

**解决方案**：

1. **检查 Ganache 是否运行**
```bash
# 启动本地区块链
npm run ganache
```

2. **检查网络配置**
确保 `truffle-config.js` 中的网络配置正确：
```javascript
development: {
  host: '127.0.0.1',
  port: 8545,
  network_id: '*',
}
```

3. **检查账户余额**
确保部署账户有足够的 ETH 支付 gas 费用

4. **重新部署**
```bash
npm run migrate:reset
```

### 问题4：合约地址未更新

**症状**：前端无法与合约交互

**解决方案**：
1. 部署成功后，将合约地址更新到 `client/src/services/DataStorageService.js`
2. 或在 `.env` 文件中设置 `REACT_APP_CONTRACT_ADDRESS`

## 🖥️ 前端问题

### 问题5：前端启动失败

**症状**：运行 `npm run dev` 时出错

**解决方案**：

1. **检查依赖安装**
```bash
npm run install-all
```

2. **清除缓存**
```bash
cd client
rm -rf node_modules package-lock.json
npm install
```

3. **检查端口占用**
默认端口 3000 可能被占用，尝试使用其他端口：
```bash
cd client
PORT=3001 npm start
```

### 问题6：Web3 相关错误

**症状**：浏览器控制台出现 Web3 相关错误

**解决方案**：
1. 确保使用 HTTPS 或 localhost（不要使用 HTTP）
2. 检查 MetaMask 版本是否最新
3. 清除浏览器缓存和 MetaMask 数据

## 📦 依赖问题

### 问题7：npm 安装失败

**症状**：运行 `npm install` 时出错

**解决方案**：

1. **清除缓存**
```bash
npm cache clean --force
```

2. **删除 node_modules**
```bash
rm -rf node_modules package-lock.json
npm install
```

3. **使用不同的包管理器**
```bash
# 尝试使用 yarn
yarn install
```

4. **检查 Node.js 版本**
确保使用 Node.js 16+ 版本

### 问题8：Truffle 编译错误

**症状**：运行 `truffle compile` 时出错

**解决方案**：

1. **检查 Solidity 版本**
确保 `truffle-config.js` 中的编译器版本与合约版本匹配

2. **清除构建缓存**
```bash
npm run clean
npm run compile
```

3. **检查 OpenZeppelin 版本**
确保使用兼容的 OpenZeppelin 版本

## 🔍 调试技巧

### 启用详细日志

1. **浏览器控制台**
   - 打开开发者工具 (F12)
   - 查看 Console 标签页中的错误信息

2. **MetaMask 调试**
   - 打开 MetaMask 设置
   - 启用"显示测试网络"
   - 查看活动日志

3. **Truffle 调试**
```bash
# 启用详细输出
truffle migrate --verbose-rpc
truffle test --verbose-rpc
```

### 常用检查命令

```bash
# 检查 Truffle 版本
truffle version

# 检查网络连接
truffle console
> web3.eth.getAccounts()

# 检查合约状态
truffle console
> const instance = await DataStorage.deployed()
> instance.address
> await instance.getStats()
```

## 🆘 获取帮助

如果以上解决方案都不能解决您的问题：

1. **检查项目文档**
   - 阅读 [README.md](./README.md)
   - 查看代码注释

2. **搜索已知问题**
   - 查看 [GitHub Issues](https://github.com/juzhiqiang/mask-truffle-ai/issues)
   - 搜索相关错误信息

3. **创建新的 Issue**
   - 提供详细的错误信息
   - 包含环境信息（Node.js版本、操作系统等）
   - 描述重现步骤

4. **社区支持**
   - Truffle 官方文档
   - Ethereum 开发者社区
   - Stack Overflow

## 📱 环境要求检查清单

- [ ] Node.js >= 16.0.0
- [ ] npm >= 8.0.0
- [ ] MetaMask 浏览器扩展已安装
- [ ] 至少一个以太坊账户
- [ ] 测试网络 ETH（用于测试网部署）
- [ ] 正确的网络配置
- [ ] 防火墙允许相关端口（3000, 8545）

## 🔄 重置项目

如果遇到严重问题，可以完全重置项目：

```bash
# 1. 清理所有依赖
rm -rf node_modules client/node_modules
rm package-lock.json client/package-lock.json

# 2. 清理构建文件
rm -rf build client/build

# 3. 重新安装
npm run setup

# 4. 重新部署
npm run migrate:reset
```

---

如果您发现其他常见问题或有改进建议，欢迎提交 Pull Request 来完善这份指南！
