# 本地合约部署指南

## 快速部署到本地链

### 方法1：自动化部署（推荐）

1. **安装依赖**
```bash
npm install
```

2. **启动 Ganache**
```bash
npm run ganache
```
保持此终端窗口运行。

3. **部署合约**（新开终端窗口）
```bash
npm run deploy:local
```

### 方法2：手动部署

1. **启动 Ganache**
```bash
# 方式1：使用npm脚本
npm run ganache

# 方式2：直接使用ganache命令
ganache --deterministic --accounts 10 --host 127.0.0.1 --port 8545
```

2. **编译合约**
```bash
npm run compile
```

3. **部署合约**
```bash
npm run migrate:ganache
```

## 部署后配置

部署成功后，你需要更新前端配置：

1. 找到合约地址（部署日志中会显示）
2. 打开 `client/src/services/LogChainService.js`
3. 在 `DATA_LOG_CONTRACT_ADDRESSES` 中添加：
```javascript
'ganache': '0x你的合约地址',
// 或
'localhost': '0x你的合约地址',
```

4. 在 `networkNames` 中添加对应的网络ID映射：
```javascript
1337: 'ganache', // 或你的实际网络ID
```

## 网络配置说明

项目支持以下本地网络：
- **development**: Ganache GUI (端口7545)
- **ganache**: Ganache CLI (端口8545) 
- **ganache_cli**: 固定网络ID 1337 (端口8545)

## 常见问题

**Q: "当前网络暂不支持日志合约功能"**
A: 确保已经部署合约并在LogChainService.js中配置了正确的合约地址。

**Q: Ganache连接失败**
A: 检查Ganache是否在正确的端口运行，默认是8545。

**Q: 合约部署失败**
A: 确保Ganache正在运行且有足够的测试ETH。

## 验证部署

部署成功后：
1. 启动前端：`npm run dev`
2. 连接钱包到本地网络（通常是localhost:8545，Chain ID: 1337）
3. 切换到"日志上链"标签页
4. 应该不再显示"网络不支持"的错误

## 文件结构

```
├── contracts/
│   ├── DataLogContract.sol     # 主要的数据上链合约
│   └── Migrations.sol          # Truffle迁移合约
├── migrations/
│   ├── 1_initial_migration.js
│   ├── 2_deploy_contracts.js   # 完整部署脚本
│   └── 3_deploy_datalog_local.js # 本地专用部署脚本
├── scripts/
│   └── deploy-local.js         # 自动化部署脚本
└── deployments/               # 部署信息存储（自动生成）
    └── ganache.json
```