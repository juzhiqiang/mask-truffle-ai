# The Graph 子图配置模板
# 这些文件需要在部署合约后配置具体的合约地址

# 1. subgraph.yaml (子图清单文件)
specVersion: 0.0.4
schema:
  file: ./schema.graphql
dataSources:
  - kind: ethereum
    name: DataLogContract
    network: mainnet  # 根据实际部署的网络修改
    source:
      address: "0x0000000000000000000000000000000000000000"  # 替换为实际的合约地址
      abi: DataLogContract
      startBlock: 0  # 替换为合约部署的区块号
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.6
      language: wasm/assemblyscript
      entities:
        - DataStored
        - BatchDataStored
      abis:
        - name: DataLogContract
          file: ./abis/DataLogContract.json
      eventHandlers:
        - event: DataStored(indexed uint256,indexed address,indexed string,string,uint256,bytes32)
          handler: handleDataStored
        - event: BatchDataStored(uint256[],indexed address,indexed string,uint256)
          handler: handleBatchDataStored
      file: ./src/mapping.ts

# 2. schema.graphql (GraphQL 数据模式)
type DataStored @entity {
  id: ID!
  logId: BigInt!
  creator: Bytes!
  dataType: String!
  content: String!
  timestamp: BigInt!
  dataHash: Bytes!
  blockNumber: BigInt!
  transactionHash: Bytes!
}

type BatchDataStored @entity {
  id: ID!
  logIds: [BigInt!]!
  creator: Bytes!
  dataType: String!
  timestamp: BigInt!
  blockNumber: BigInt!
  transactionHash: Bytes!
}

# 3. src/mapping.ts (事件处理映射)
import { 
  DataStored as DataStoredEvent,
  BatchDataStored as BatchDataStoredEvent
} from "../generated/DataLogContract/DataLogContract";
import { DataStored, BatchDataStored } from "../generated/schema";

export function handleDataStored(event: DataStoredEvent): void {
  let entity = new DataStored(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  
  entity.logId = event.params.logId;
  entity.creator = event.params.creator;
  entity.dataType = event.params.dataType;
  entity.content = event.params.content;
  entity.timestamp = event.params.timestamp;
  entity.dataHash = event.params.dataHash;
  entity.blockNumber = event.block.number;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleBatchDataStored(event: BatchDataStoredEvent): void {
  let entity = new BatchDataStored(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  
  entity.logIds = event.params.logIds;
  entity.creator = event.params.creator;
  entity.dataType = event.params.dataType;
  entity.timestamp = event.params.timestamp;
  entity.blockNumber = event.block.number;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

# 4. package.json (子图项目依赖)
{
  "name": "mask-truffle-ai-subgraph",
  "version": "1.0.0",
  "scripts": {
    "codegen": "graph codegen",
    "build": "graph build",
    "deploy": "graph deploy --node https://api.thegraph.com/deploy/ your-username/mask-truffle-ai-mainnet",
    "create-local": "graph create --node http://localhost:8020/ mask-truffle-ai",
    "remove-local": "graph remove --node http://localhost:8020/ mask-truffle-ai",
    "deploy-local": "graph deploy --node http://localhost:8020/ --ipfs http://localhost:5001 mask-truffle-ai"
  },
  "dependencies": {
    "@graphprotocol/graph-cli": "0.50.0",
    "@graphprotocol/graph-ts": "0.29.3"
  }
}

# 部署说明：
# 1. 先部署合约到测试网或主网
# 2. 记录合约地址和部署区块号
# 3. 更新 subgraph.yaml 中的地址和起始区块
# 4. 将合约ABI复制到 abis/DataLogContract.json
# 5. 运行 npm run codegen 生成代码
# 6. 运行 npm run build 构建子图
# 7. 运行 npm run deploy 部署到 The Graph 网络