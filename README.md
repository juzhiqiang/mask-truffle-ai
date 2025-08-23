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
└── README.md
```

## 💡 功能说明

### 智能合约功能
- **数据存储** (`storeData`): 将数据存储到区块链
- **数据查询** (`getDataRecord`): 根据ID查询单条记录
- **批量查询** (`getActiveRecords`): 分页查询活跃记录
- **类型查询** (`getRecordsByType`): 按数据类型查询
- **创建者查询** (`getRecordsByCreator`): 按创建者查询
- **数据更新** (`updateData`): 更新现有数据
- **数据停用** (`deactivateData`): 停用数据记录
- **统计信息** (`getStats`): 获取统计数据

### 前端功能
- **钱包连接**: 支持MetaMask连接和断开
- **数据上链**: 表单提交数据到区块链
- **多种查询**: 支持全部、类型、创建者、ID查询
- **数据展示**: 表格形式展示查询结果
- **实时统计**: 显示总记录数和活跃记录数
- **响应式设计**: 适配不同屏幕尺寸

## 🧪 测试

### 运行合约测试
```bash
npm run test
# 或者
truffle test
```

### 测试网络交互
1. 确保MetaMask已连接到正确的网络
2. 确保账户有足够的测试ETH
3. 在前端界面进行各种操作测试

## 📝 使用说明

### 1. 连接钱包
- 点击右上角"连接钱包"按钮
- 选择MetaMask并授权连接
- 确认网络切换（如需要）

### 2. 查询数据
- 在左侧面板选择查询类型
- 输入查询条件（如适用）
- 点击"查询"按钮查看结果

### 3. 添加数据
- 点击"添加数据"按钮
- 填写数据类型和内容
- 确认交易并等待上链

### 4. 数据类型示例
- `transaction`: 交易相关数据
- `contract`: 合约相关数据
- `user`: 用户相关数据
- `log`: 日志数据
- 或自定义类型

## 🔐 安全注意事项

- **私钥安全**: 永远不要在代码中硬编码私钥
- **网络确认**: 部署前确认目标网络
- **合约验证**: 在区块链浏览器上验证合约源码
- **权限管理**: 注意合约的所有者权限
- **Gas费用**: 注意交易的Gas费用设置

## 🚀 部署到生产环境

### 1. 主网部署
```bash
# 确保.env文件配置正确
truffle migrate --network mainnet

# 验证合约（可选）
truffle run verify DataStorage --network mainnet
```

### 2. 前端部署
```bash
# 构建生产版本
cd client
npm run build

# 部署到静态托管服务（如Netlify, Vercel等）
```

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙋‍♂️ 常见问题

### Q: MetaMask连接失败怎么办？
A: 确保已安装MetaMask扩展，并且浏览器允许访问。检查网络连接和账户解锁状态。

### Q: 合约部署失败？
A: 检查网络配置、账户余额、Gas设置。确保Infura项目ID和助记词正确。

### Q: 前端显示"Contract not initialized"？
A: 确保合约已正确部署，并且在DataStorageService.js中配置了正确的合约地址。

### Q: 交易失败？
A: 检查账户ETH余额、Gas设置、网络拥堵情况。确保合约方法调用参数正确。

## 📞 联系我们

- 项目地址: [GitHub Repository](https://github.com/juzhiqiang/mask-truffle-ai)
- 问题反馈: [Issues](https://github.com/juzhiqiang/mask-truffle-ai/issues)
- 邮箱: your-email@example.com

---

**感谢使用 Mask Truffle AI 区块链数据上链系统！** 🎉
