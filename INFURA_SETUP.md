# 配置 Infura 服务

要启用从区块链读取备注信息的功能，需要配置 Infura 项目 ID。

## 获取 Infura 项目 ID

1. 访问 [Infura 官网](https://infura.io/)
2. 注册或登录账户
3. 创建新项目
4. 获取项目 ID

## 配置步骤

1. 打开 `client/src/services/InfuraService.js` 文件
2. 找到第 6 行：
   ```javascript
   this.infuraProjectId = 'YOUR_INFURA_PROJECT_ID';
   ```
3. 将 `YOUR_INFURA_PROJECT_ID` 替换为你的实际项目 ID：
   ```javascript
   this.infuraProjectId = '你的实际项目ID';
   ```

## 功能说明

配置完成后，系统将能够：

- 在 ETH 转账时将备注信息写入区块链的 Input Data 字段
- 使用 Infura 服务从区块链读取交易的 Input Data
- 在交易记录列表中显示从链上读取的备注信息
- 在交易详情中同时显示本地存储的备注和链上备注

## 支持的网络

- 以太坊主网 (Mainnet)
- Goerli 测试网
- Sepolia 测试网
- Polygon 主网
- Mumbai 测试网

## 注意事项

- 如果未配置 Infura，系统仍可正常工作，但无法读取链上备注
- 备注信息会始终写入到交易的 Input Data 中
- 只有 UTF-8 编码的文本备注能够正确解析显示