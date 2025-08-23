# Mask Truffle AI - 区块链数据上链系统

基于Truffle和React的区块链数据存储和查询系统，实现数据的链上存储、查询和管理功能。

## 🚀 项目特性

- **智能合约**: 使用Solidity开发的数据存储合约，支持数据上链、查询、更新和停用
- **前端界面**: 基于React + Ant Design的现代化用户界面
- **钱包集成**: 支持MetaMask等Web3钱包连接
- **多网络支持**: 支持主网、测试网和本地开发网络
- **数据查询**: 支持多种查询方式：按类型、创建者、ID等
- **实时统计**: 显示链上数据统计信息
- **响应式设计**: 适配移动端和桌面端

## 📋 技术栈

### 后端 (区块链)
- **Solidity** ^0.8.19 - 智能合约开发
- **Truffle** ^5.11.5 - 开发框架
- **OpenZeppelin** ^4.9.3 - 安全合约库
- **HDWallet Provider** - 钱包连接

### 前端
- **React** ^18.2.0 - 用户界面
- **Ethers.js** ^5.7.2 - 区块链交互
- **Web3-React** - 钱包连接管理
- **Ant Design** ^5.6.1 - UI组件库
- **React Hooks** - 状态管理

## 🛠️ 安装与运行

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0
- MetaMask 浏览器扩展
- Ganache CLI (本地开发)

### 1. 克隆项目
```bash
git clone https://github.com/juzhiqiang/mask-truffle-ai.git
cd mask-truffle-ai
```

### 2. 安装依赖
```bash
# 安装根目录和客户端依赖
npm run install-all

# 或者分别安装
npm install
cd client && npm install
```

### 3. 环境配置
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，配置以下变量：
INFURA_PROJECT_ID=your_infura_project_id
MNEMONIC=your_wallet_mnemonic_phrase
REACT_APP_INFURA_ID=your_infura_project_id
REACT_APP_NETWORK=sepolia
```

### 4. 编译智能合约
```bash
npm run compile
```

### 5. 部署合约

#### 本地开发网络
```bash
# 启动Ganache (新终端)
npx ganache-cli

# 部署到本地网络
npm run migrate
```

#### 测试网络 (Sepolia)
```bash
# 部署到Sepolia测试网
truffle migrate --network sepolia
```

### 6. 更新前端配置
部署成功后，将合约地址更新到 `client/src/services/DataStorageService.js` 中的 `CONTRACT_ADDRESS`。

### 7. 启动前端应用
```bash
npm run dev
# 或者
cd client && npm start
```

应用将在 http://localhost:3000 上运行。

## 🔧 项目结构

```
mask-truffle-ai/
├── contracts/                 # 智能合约
│   ├── DataStorage.sol        # 主数据存储合约
│   └── Migrations.sol         # Truffle迁移合约
├── migrations/                # 部署脚本
│   ├── 1_initial_migration.js
│   └── 2_deploy_contracts.js
├── test/                      # 合约测试
│   └── DataStorage.test.js
├── client/                    # React前端应用
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/        # 组件
│   │   │   └── WalletConnection.js
│   │   ├── services/          # 服务类
│   │   │   └── DataStorageService.js
│   │   ├── App.js            # 主组件
│   │   ├── App.css           # 样式文件
│   │   ├── index.js          # 入口文件
│   │   └── index.css
│   └── package.json
├── truffle-config.js         # Truffle配置
├── package.json              # 项目依赖
└── .env.example              # 环境变量模板
```

## 💡 使用指南

### 连接钱包
1. 确保已安装MetaMask浏览器扩展
2. 点击右上角的"连接钱包"按钮
3. 在弹出的MetaMask中确认连接
4. 连接成功后可以看到钱包地址和网络信息

### 数据上链
1. 点击侧边栏的"添加数据"按钮
2. 输入数据类型和内容
3. 点击"上链"按钮
4. 在MetaMask中确认交易
5. 等待交易完成

### 数据查询
- **查看全部**: 显示所有活跃的数据记录
- **按类型查询**: 输入数据类型进行筛选
- **按创建者查询**: 输入钱包地址查询该地址创建的数据
- **按ID查询**: 输入记录ID查询特定数据

### 数据管理
- 查看数据详情、创建时间和创建者
- 支持数据分页浏览
- 实时统计显示总记录数和活跃记录数

## 🧪 测试

运行智能合约测试：
```bash
npm test
# 或者
truffle test
```

测试覆盖以下功能：
- 数据存储功能
- 数据检索功能
- 数据更新功能
- 权限控制
- 数据分页

## 📝 智能合约功能

### DataStorage.sol 主要方法

- `storeData(string dataType, string content)`: 存储数据到区块链
- `getDataRecord(uint256 recordId)`: 根据ID获取数据记录
- `getActiveRecords(uint256 offset, uint256 limit)`: 分页获取活跃记录
- `getRecordsByType(string dataType)`: 根据类型获取记录ID列表
- `getRecordsByCreator(address creator)`: 根据创建者获取记录ID列表
- `updateData(uint256 recordId, string newContent)`: 更新数据内容
- `deactivateData(uint256 recordId)`: 停用数据记录
- `getStats()`: 获取统计信息

### 事件
- `DataStored`: 数据存储事件
- `DataUpdated`: 数据更新事件
- `DataDeactivated`: 数据停用事件

## 🌐 网络配置

### 支持的网络
- **Mainnet**: 以太坊主网
- **Sepolia**: 测试网络
- **Development**: 本地Ganache网络

### 网络切换
在MetaMask中切换到对应网络，应用会自动检测并连接。

## 🔐 安全特性

- **访问控制**: 只有数据创建者可以更新或停用自己的数据
- **重入攻击防护**: 使用OpenZeppelin的ReentrancyGuard
- **所有权管理**: 合约所有者具有管理权限
- **数据验证**: 严格的输入验证和错误处理

## 🚧 开发计划

- [ ] 添加数据加密功能
- [ ] 实现数据批量操作
- [ ] 添加数据导入/导出功能
- [ ] 支持更多钱包连接方式
- [ ] 优化gas费用消耗
- [ ] 添加数据可视化图表
- [ ] 实现多语言支持
- [ ] 添加数据备份功能

## 🤝 贡献指南

1. Fork 这个仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 📄 许可证

这个项目使用 MIT 许可证。查看 [LICENSE](LICENSE) 文件了解更多详情。

## 🆘 故障排除

### 常见问题

**Q: MetaMask连接失败**
A: 确保已安装MetaMask扩展，并且已解锁钱包

**Q: 交易失败**
A: 检查钱包余额是否足够支付gas费用，确认网络设置正确

**Q: 找不到合约**
A: 确保合约已正确部署，并且前端配置了正确的合约地址

**Q: 数据加载失败**
A: 检查网络连接，确认连接到正确的区块链网络

### 获取帮助
- 提交 [GitHub Issues](https://github.com/juzhiqiang/mask-truffle-ai/issues)
- 查看项目文档
- 联系项目维护者

## 🙏 致谢

感谢以下开源项目：
- [Truffle Suite](https://trufflesuite.com/)
- [OpenZeppelin](https://openzeppelin.com/)
- [React](https://reactjs.org/)
- [Ant Design](https://ant.design/)
- [Ethers.js](https://ethers.io/)

---

**⭐ 如果这个项目对你有帮助，请给个Star支持一下！**
