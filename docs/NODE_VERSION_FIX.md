# Node.js 版本兼容性问题解决方案

## 问题描述
Node.js v22.16.0 与 Truffle 内置的 Ganache 存在兼容性问题，导致 `µWS` 模块无法正常工作。

## 解决方案

### 方案1：使用独立的Ganache CLI（推荐）

1. **更新依赖**
```bash
npm install
```

2. **启动Ganache**
```bash
# 使用项目脚本（端口7545）
npm run ganache

# 或者使用8545端口
npm run ganache:8545

# 或者直接使用npx
npx ganache --deterministic --accounts 10 --host 127.0.0.1 --port 7545
```

3. **部署合约**
```bash
npm run deploy:local
```

### 方案2：手动部署

如果自动部署脚本仍有问题，可以手动执行：

```bash
# 1. 启动Ganache
npx ganache --deterministic --accounts 10 --host 127.0.0.1 --port 7545

# 2. 编译合约
npx truffle compile

# 3. 部署（尝试不同网络）
npx truffle migrate --network development --reset
# 或
npx truffle migrate --network ganache --reset
```

### 方案3：使用Hardhat（如果Truffle问题持续）

作为备选方案，可以考虑迁移到Hardhat：

```bash
npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers
npx hardhat init
```

## 已修复的问题

1. **更新了依赖版本**：升级到最新兼容版本
2. **改进了部署脚本**：
   - 添加了多网络重试机制
   - 过滤了已知的警告信息
   - 增强了错误处理
3. **统一了端口配置**：默认使用7545端口
4. **提供了多种启动选项**

## 网络配置

项目现在支持以下网络：
- `development`: 端口7545 (推荐)
- `ganache`: 端口8545
- `ganache_cli`: 端口8545，固定网络ID 1337

## 故障排除

如果问题仍然存在：

1. **清理并重新安装依赖**
```bash
rm -rf node_modules package-lock.json
npm install
```

2. **检查端口占用**
```bash
# Windows
netstat -an | findstr :7545

# 或者尝试其他端口
netstat -an | findstr :8545
```

3. **尝试不同的Node版本**
建议使用Node.js LTS版本（如v18.x或v20.x）

4. **手动配置网络**
如果自动检测失败，手动编辑 `client/src/services/LogChainService.js`：
```javascript
// 根据你的实际网络ID添加映射
1337: 'ganache',  // 或你的实际网络ID
```

## 成功标志

部署成功后，你应该看到：
- 合约编译成功
- 合约部署成功并显示地址
- 生成了 `deployments/*.json` 文件
- 前端不再显示"网络不支持"错误