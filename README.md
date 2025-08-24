# Mask Truffle AI - 区块链钱包系统（支持自定义数据）

基于Truffle和React的区块链钱包和数据存储系统，实现ETH/USDT转账、日志上链和自定义数据功能。

## 🌟 最新功能

### ✨ **自定义数据支持**
- **ETH转账** + 自定义数据 → 编码到交易的data字段
- **USDT转账** + 自定义数据 → 保存到本地记录  
- **日志上链** + 自定义数据 → 永久存储到区块链合约
- **数据类型**：支持文本、数字、布尔值、JSON四种类型
- **可视化查看**：表格展示，一键查看详细信息

### 🎯 **进度条系统**
- **实时进度**：显示0-100%的操作进度
- **步骤追踪**：详细的操作步骤说明
- **状态反馈**：成功、失败、进行中三种状态
- **美观动画**：流动效果和发光动画

## 🚀 项目特性

- **多功能钱包**: ETH直接转账、USDT代币转账、日志数据上链
- **智能合约**: 使用Solidity开发的数据存储合约
- **自定义数据**: 为每笔交易和日志添加个性化数据
- **进度可视化**: 完整的操作进度条和状态提示
- **钱包集成**: 支持MetaMask等Web3钱包连接
- **多网络支持**: 支持Ethereum、BSC、Polygon等主流网络
- **响应式设计**: 适配移动端和桌面端

## 📋 技术栈

### 区块链
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

## 💰 功能详述

### 1. ETH转账（支持自定义数据）
```javascript
✅ 直接钱包转账，无需合约部署
✅ 自定义数据编码到交易data字段
✅ 完整的进度条显示
✅ 本地转账记录存储
✅ 实时Gas费用估算
```

### 2. USDT转账（支持自定义数据）
```javascript  
✅ 支持多网络USDT转账
✅ 自动检测余额和网络
✅ 自定义数据本地存储
✅ 一键转账全部余额
✅ 智能合约交互
```

### 3. 日志上链（支持自定义数据）
```javascript
✅ 永久存储到区块链合约
✅ 自定义数据不可篡改
✅ 多级别日志支持
✅ 标签和分类系统
✅ 完整的审计追踪
```

## 🛠️ 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0
- MetaMask 浏览器扩展

### 1. 克隆项目
```bash
git clone https://github.com/juzhiqiang/mask-truffle-ai.git
cd mask-truffle-ai
```

### 2. 安装依赖
```bash
npm install
cd client && npm install
```

### 3. 启动应用
```bash
# 在client目录下
npm start
```

### 4. 连接钱包
1. 访问 http://localhost:3000
2. 点击右上角"连接钱包"
3. 在MetaMask中确认连接
4. 开始使用各项功能！

## 📝 自定义数据使用指南

### 添加自定义字段
1. 在任意功能页面找到**"自定义数据字段"**
2. 点击展开面板
3. 点击**"添加自定义字段"**按钮
4. 配置字段：
   - **字段名**：如 `priority`, `memo`, `user_id`
   - **类型**：文本/数字/布尔值/JSON
   - **字段值**：具体的数据内容

### 示例用法
```javascript
// ETH转账 + 自定义数据
接收地址: 0x742d35...
转账金额: 0.1 ETH
备注: 工资发放

自定义字段:
- department: "技术部"     (文本)
- employee_id: 1001       (数字) 
- is_bonus: true         (布尔值)
- details: {"month":12}  (JSON)

结果: 自定义数据编码到区块链交易中！
```

### 查看自定义数据
- 在记录表格中点击**"查看(N)"**按钮
- 弹窗显示所有自定义数据
- JSON格式美化，类型标识清晰

## 🎯 应用场景

### 企业财务管理
- **工资发放**：员工信息、部门、职位等数据
- **供应商付款**：发票号、采购单号、验收状态
- **报销管理**：报销类型、申请人、审批状态

### 系统运维审计
- **错误日志**：用户ID、错误代码、环境信息
- **操作审计**：操作人、操作类型、业务数据
- **监控告警**：告警级别、相关服务、处理状态

### DeFi应用
- **交易记录**：策略信息、风险等级、执行参数
- **流动性管理**：池子信息、收益数据、时间戳
- **治理投票**：提案ID、投票原因、委托信息

## 📊 数据存储说明

### ETH转账自定义数据
- **存储位置**：区块链交易data字段
- **永久性**：永久存储，公开可查
- **大小限制**：建议不超过1KB
- **查看方式**：区块浏览器可见

### 日志自定义数据  
- **存储位置**：智能合约storage
- **持久性**：永久保存，去中心化
- **数据完整性**：不可篡改
- **查询方式**：合约方法调用

### USDT转账自定义数据
- **存储位置**：浏览器localStorage
- **备份建议**：重要数据请手动备份
- **访问权限**：仅本地设备可见
- **存储限制**：浏览器限制（5-10MB）

## 🔧 项目结构

```
mask-truffle-ai/
├── contracts/                 # 智能合约
│   ├── DataStorage.sol        # 数据存储合约
│   └── Migrations.sol         # 迁移合约
├── migrations/                # 部署脚本
├── test/                      # 合约测试
├── client/                    # React前端
│   ├── src/
│   │   ├── components/        # 组件
│   │   │   ├── WalletConnection.js  # 钱包连接
│   │   │   └── ProgressBar.js       # 进度条
│   │   ├── services/          # 服务类
│   │   │   ├── DataStorageService.js # 合约服务
│   │   │   └── USDTService.js       # USDT服务
│   │   ├── App.js            # 主组件
│   │   └── App.css           # 样式
│   └── package.json
├── docs/                      # 文档
│   ├── USER_GUIDE.md         # 用户指南
│   ├── PROGRESS_BAR_GUIDE.md # 进度条指南
│   └── CUSTOM_DATA_GUIDE.md  # 自定义数据指南
└── truffle-config.js         # Truffle配置
```

## 💡 使用指南

### ETH转账流程
1. 切换到"ETH转账"标签
2. 填写接收地址和金额
3. 可选：添加备注和自定义数据
4. 点击"立即转账"
5. 观察进度条，在钱包中确认交易
6. 等待交易完成

### USDT转账流程  
1. 确保网络支持USDT（以太坊/BSC/Polygon）
2. 切换到"USDT转账"标签
3. 系统自动显示余额
4. 填写转账信息和自定义数据
5. 点击"发送USDT"
6. 等待交易确认

### 日志上链流程
1. 切换到"日志上链"标签
2. 选择日志级别和来源
3. 输入详细日志消息
4. 添加标签和自定义数据
5. 点击"提交到区块链"
6. 数据永久存储到合约中

## 🧪 测试功能

### 合约测试
```bash
npm test
# 或者
truffle test
```

### 功能测试建议
1. **转账测试**：使用测试网络进行小额转账
2. **数据验证**：检查自定义数据是否正确存储
3. **进度跟踪**：观察进度条是否准确显示
4. **错误处理**：测试网络异常情况
5. **界面响应**：检查移动端适配

## 🌐 支持的网络

### 主要网络
- **Ethereum 主网**: ETH转账 + 日志上链
- **Sepolia 测试网**: 开发测试
- **BSC 主网**: USDT转账
- **Polygon 主网**: USDT转账
- **本地网络**: Ganache开发环境

### 网络切换
在MetaMask中切换网络，应用会自动适配相应功能。

## 🔐 安全特性

- **钱包安全**: 所有交易需要钱包确认
- **数据验证**: 严格的输入验证和格式检查
- **合约权限**: 基于创建者的访问控制
- **错误处理**: 完善的异常处理机制
- **Gas优化**: 智能Gas费用估算和缓冲

## 📚 详细文档

- **[用户指南](docs/USER_GUIDE.md)**: 完整的使用说明
- **[进度条指南](docs/PROGRESS_BAR_GUIDE.md)**: 进度条功能详解
- **[自定义数据指南](docs/CUSTOM_DATA_GUIDE.md)**: 自定义数据使用方法

## 🚧 开发计划

### 近期计划
- [ ] 添加更多代币支持（DAI、USDC等）
- [ ] 实现批量转账功能
- [ ] 添加交易历史导出
- [ ] 优化移动端体验

### 长期计划
- [ ] 支持更多区块链网络
- [ ] 添加DeFi协议集成
- [ ] 实现多签钱包支持
- [ ] 开发Chrome扩展版本

## 🤝 贡献指南

1. Fork 项目仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 🆘 故障排除

### 常见问题

**Q: 转账失败怎么办？**
A: 检查钱包余额、网络状态和Gas设置，确认交易信息正确

**Q: 自定义数据丢失了？**
A: ETH转账数据在区块链上永久保存，USDT和日志数据请检查存储位置

**Q: 进度条卡住不动？**
A: 网络拥堵可能导致延迟，请耐心等待或检查钱包确认状态

**Q: USDT余额显示为0？**
A: 确认当前网络支持USDT，检查钱包中是否真的有USDT余额

### 获取帮助
- 查看 [故障排除文档](TROUBLESHOOTING.md)
- 提交 [GitHub Issues](https://github.com/juzhiqiang/mask-truffle-ai/issues)
- 查看项目 [Wiki](https://github.com/juzhiqiang/mask-truffle-ai/wiki)

## 📄 许可证

本项目使用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

感谢以下开源项目和社区：
- [Truffle Suite](https://trufflesuite.com/) - 区块链开发框架
- [OpenZeppelin](https://openzeppelin.com/) - 安全智能合约库
- [React](https://reactjs.org/) - 用户界面框架
- [Ant Design](https://ant.design/) - UI组件库
- [Ethers.js](https://ethers.io/) - 以太坊交互库

---

## 🌟 功能预览

### 自定义数据功能
![自定义数据](https://via.placeholder.com/600x300/4f46e5/ffffff?text=自定义数据功能)

### 进度条系统
![进度条](https://via.placeholder.com/600x200/059669/ffffff?text=实时进度条)

### 多功能钱包
![钱包界面](https://via.placeholder.com/600x400/dc2626/ffffff?text=多功能钱包界面)

---

**⭐ 如果这个项目对您有帮助，请给个Star支持一下！您的支持是我们持续改进的动力！**

**🎯 立即体验：克隆项目，连接钱包，开始您的区块链之旅！**
