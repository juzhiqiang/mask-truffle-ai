// The Graph 数据查询服务
// 用于从The Graph协议查询链上数据事件

import { request, gql } from 'graphql-request';

class TheGraphService {
  constructor() {
    // The Graph 子图端点 - 需要部署后配置
    this.subgraphEndpoints = {
      // 以太坊主网
      'ethereum': 'https://api.thegraph.com/subgraphs/name/your-username/mask-truffle-ai-mainnet',
      // 测试网络
      'sepolia': 'https://api.studio.thegraph.com/query/119163/info/v0.0.3',
      // 本地开发
      'hardhat': 'http://localhost:8000/subgraphs/name/mask-truffle-ai',
      'ganache': 'http://localhost:8000/subgraphs/name/mask-truffle-ai'
    };
    
    this.currentEndpoint = null;
  }

  // 设置当前网络端点
  setNetwork(networkName) {
    if (this.subgraphEndpoints[networkName]) {
      this.currentEndpoint = this.subgraphEndpoints[networkName];
      console.log(`The Graph endpoint set to: ${this.currentEndpoint}`);
      return true;
    } else {
      console.warn(`Unsupported network for The Graph: ${networkName}`);
      this.currentEndpoint = null;
      return false;
    }
  }

  // 检查The Graph服务是否可用
  isAvailable() {
    return this.currentEndpoint !== null;
  }

  // GraphQL 查询：获取所有数据存储事件
  async getAllDataStoredEvents(first = 100, skip = 0, orderBy = 'timestamp', orderDirection = 'desc') {
    if (!this.currentEndpoint) {
      throw new Error('The Graph endpoint not configured');
    }

    const query = gql`
      query GetAllDataStoredEvents($first: Int!, $skip: Int!, $orderBy: DataStored_orderBy!, $orderDirection: OrderDirection!) {
        dataStoreds(
          first: $first
          skip: $skip
          orderBy: $orderBy
          orderDirection: $orderDirection
        ) {
          id
          logId
          creator
          dataType
          content
          timestamp
          dataHash
          blockNumber
          transactionHash
          value
          toAddress
          fromAddress
          transactionHash
          blockNumber
          contractAddress
          inputData
          onChainContent
          transactionTime
          transactionFee
          gasPrice
        }
      }
    `;

    try {
      const variables = { first, skip, orderBy, orderDirection };
      const data = await request(this.currentEndpoint, query, variables);
      
      return data.dataStoreds.map(event => ({
        id: event.id,
        logId: event.logId,
        creator: event.creator,
        dataType: event.dataType,
        content: event.content,
        timestamp: parseInt(event.timestamp),
        date: new Date(parseInt(event.timestamp) * 1000).toLocaleString(),
        dataHash: event.dataHash,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        value: event.value,
        toAddress: event.toAddress,
        fromAddress: event.fromAddress,
        contractAddress: event.contractAddress,
        inputData: event.inputData,
        onChainContent: event.onChainContent,
        transactionTime: event.transactionTime,
        transactionFee: event.transactionFee,
        gasPrice: event.gasPrice,
        source: 'thegraph'
      }));
    } catch (error) {
      console.error('Query all data stored events failed:', error);
      throw new Error(`The Graph query failed: ${error.message}`);
    }
  }

  // 根据创建者地址查询数据
  async getDataByCreator(creator, first = 50, skip = 0) {
    if (!this.currentEndpoint) {
      throw new Error('The Graph endpoint not configured');
    }

    const query = gql`
      query GetDataByCreator($creator: Bytes!, $first: Int!, $skip: Int!) {
        dataStoreds(
          where: { creator: $creator }
          first: $first
          skip: $skip
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          logId
          creator
          dataType
          content
          timestamp
          dataHash
          blockNumber
          transactionHash
          value
          toAddress
          fromAddress
          transactionHash
          blockNumber
          contractAddress
          inputData
          onChainContent
          transactionTime
          transactionFee
          gasPrice
        }
      }
    `;

    try {
      const variables = { creator: creator.toLowerCase(), first, skip };
      const data = await request(this.currentEndpoint, query, variables);
      
      return data.dataStoreds.map(event => ({
        id: event.id,
        logId: event.logId,
        creator: event.creator,
        dataType: event.dataType,
        content: event.content,
        timestamp: parseInt(event.timestamp),
        date: new Date(parseInt(event.timestamp) * 1000).toLocaleString(),
        dataHash: event.dataHash,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        value: event.value,
        toAddress: event.toAddress,
        fromAddress: event.fromAddress,
        contractAddress: event.contractAddress,
        inputData: event.inputData,
        onChainContent: event.onChainContent,
        transactionTime: event.transactionTime,
        transactionFee: event.transactionFee,
        gasPrice: event.gasPrice,
        source: 'thegraph'
      }));
    } catch (error) {
      console.error('Query data by creator failed:', error);
      throw new Error(`The Graph query failed: ${error.message}`);
    }
  }

  // 根据数据类型查询
  async getDataByType(dataType, first = 50, skip = 0) {
    if (!this.currentEndpoint) {
      throw new Error('The Graph endpoint not configured');
    }

    const query = gql`
      query GetDataByType($dataType: String!, $first: Int!, $skip: Int!) {
        dataStoreds(
          where: { dataType: $dataType }
          first: $first
          skip: $skip
          orderBy: timestamp
          orderDirection: desc
        ) {
         id
          logId
          creator
          dataType
          content
          timestamp
          dataHash
          blockNumber
          transactionHash
          value
          toAddress
          fromAddress
          transactionHash
          blockNumber
          contractAddress
          inputData
          onChainContent
          transactionTime
          transactionFee
          gasPrice
        }
      }
    `;

    try {
      const variables = { dataType, first, skip };
      const data = await request(this.currentEndpoint, query, variables);
      
      return data.dataStoreds.map(event => ({
        id: event.id,
        logId: event.logId,
        creator: event.creator,
        dataType: event.dataType,
        content: event.content,
        timestamp: parseInt(event.timestamp),
        date: new Date(parseInt(event.timestamp) * 1000).toLocaleString(),
        dataHash: event.dataHash,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        value: event.value,
        toAddress: event.toAddress,
        fromAddress: event.fromAddress,
        contractAddress: event.contractAddress,
        inputData: event.inputData,
        onChainContent: event.onChainContent,
        transactionTime: event.transactionTime,
        transactionFee: event.transactionFee,
        gasPrice: event.gasPrice,
        source: 'thegraph'
      }));
    } catch (error) {
      console.error('Query data by type failed:', error);
      throw new Error(`The Graph query failed: ${error.message}`);
    }
  }

  // 根据交易哈希查询数据
  async getDataByTransactionHash(txHash) {
    if (!this.currentEndpoint) {
      throw new Error('The Graph endpoint not configured');
    }

    const query = gql`
      query GetDataByTransactionHash($txHash: Bytes!) {
        dataStoreds(
          where: { transactionHash: $txHash }
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          logId
          creator
          dataType
          content
          timestamp
          dataHash
          blockNumber
          transactionHash
          value
          toAddress
          fromAddress
          transactionHash
          blockNumber
          contractAddress
          inputData
          onChainContent
          transactionTime
          transactionFee
          gasPrice
        }
      }
    `;

    try {
      const variables = { txHash: txHash.toLowerCase() };
      const data = await request(this.currentEndpoint, query, variables);
      
      return data.dataStoreds.map(event => ({
        id: event.id,
        logId: event.logId,
        creator: event.creator,
        dataType: event.dataType,
        content: event.content,
        timestamp: parseInt(event.timestamp),
        date: new Date(parseInt(event.timestamp) * 1000).toLocaleString(),
        dataHash: event.dataHash,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        value: event.value,
        toAddress: event.toAddress,
        fromAddress: event.fromAddress,
        contractAddress: event.contractAddress,
        inputData: event.inputData,
        onChainContent: event.onChainContent,
        transactionTime: event.transactionTime,
        transactionFee: event.transactionFee,
        gasPrice: event.gasPrice,
        source: 'thegraph'
      }));
    } catch (error) {
      console.error('Query data by transaction hash failed:', error);
      throw new Error(`The Graph query failed: ${error.message}`);
    }
  }

  // 根据logId查询单条数据
  async getDataByLogId(logId) {
    if (!this.currentEndpoint) {
      throw new Error('The Graph endpoint not configured');
    }

    const query = gql`
      query GetDataByLogId($logId: String!) {
        dataStoreds(where: { logId: $logId }) {
          id
          logId
          creator
          dataType
          content
          timestamp
          dataHash
          blockNumber
          transactionHash
          value
          toAddress
          fromAddress
          transactionHash
          blockNumber
          contractAddress
          inputData
          onChainContent
          transactionTime
          transactionFee
          gasPrice
        }
      }
    `;

    try {
      const variables = { logId };
      const data = await request(this.currentEndpoint, query, variables);
      
      if (data.dataStoreds.length === 0) {
        return null;
      }

      const event = data.dataStoreds[0];
      return {
        id: event.id,
        logId: event.logId,
        creator: event.creator,
        dataType: event.dataType,
        content: event.content,
        timestamp: parseInt(event.timestamp),
        date: new Date(parseInt(event.timestamp) * 1000).toLocaleString(),
        dataHash: event.dataHash,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        value: event.value,
        toAddress: event.toAddress,
        fromAddress: event.fromAddress,
        contractAddress: event.contractAddress,
        inputData: event.inputData,
        onChainContent: event.onChainContent,
        transactionTime: event.transactionTime,
        transactionFee: event.transactionFee,
        gasPrice: event.gasPrice,
        source: 'thegraph'
      };
    } catch (error) {
      console.error('Query data by logId failed:', error);
      throw new Error(`The Graph query failed: ${error.message}`);
    }
  }

  // 搜索数据内容
  async searchDataContent(searchText, first = 50, skip = 0) {
    if (!this.currentEndpoint) {
      throw new Error('The Graph endpoint not configured');
    }

    const query = gql`
      query SearchDataContent($searchText: String!, $first: Int!, $skip: Int!) {
        dataStoreds(
          where: { content_contains: $searchText }
          first: $first
          skip: $skip
          orderBy: timestamp
          orderDirection: desc
        ) {
         id
          logId
          creator
          dataType
          content
          timestamp
          dataHash
          blockNumber
          transactionHash
          value
          toAddress
          fromAddress
          transactionHash
          blockNumber
          contractAddress
          inputData
          onChainContent
          transactionTime
          transactionFee
          gasPrice
        }
      }
    `;

    try {
      const variables = { searchText, first, skip };
      const data = await request(this.currentEndpoint, query, variables);
      
      return data.dataStoreds.map(event => ({
        id: event.id,
        logId: event.logId,
        creator: event.creator,
        dataType: event.dataType,
        content: event.content,
        timestamp: parseInt(event.timestamp),
        date: new Date(parseInt(event.timestamp) * 1000).toLocaleString(),
        dataHash: event.dataHash,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        value: event.value,
        toAddress: event.toAddress,
        fromAddress: event.fromAddress,
        contractAddress: event.contractAddress,
        inputData: event.inputData,
        onChainContent: event.onChainContent,
        transactionTime: event.transactionTime,
        transactionFee: event.transactionFee,
        gasPrice: event.gasPrice,
        source: 'thegraph'
      }));
    } catch (error) {
      console.error('Search data content failed:', error);
      throw new Error(`The Graph query failed: ${error.message}`);
    }
  }

  // 获取批量数据存储事件
  async getBatchDataStoredEvents(first = 50, skip = 0) {
    if (!this.currentEndpoint) {
      throw new Error('The Graph endpoint not configured');
    }

    const query = gql`
      query GetBatchDataStoredEvents($first: Int!, $skip: Int!) {
        batchDataStoreds(
          first: $first
          skip: $skip
          orderBy: timestamp
          orderDirection: desc
        ) {
         id
          logId
          creator
          dataType
          content
          timestamp
          dataHash
          blockNumber
          transactionHash
          value
          toAddress
          fromAddress
          transactionHash
          blockNumber
          contractAddress
          inputData
          onChainContent
          transactionTime
          transactionFee
          gasPrice
        }
      }
    `;

    try {
      const variables = { first, skip };
      const data = await request(this.currentEndpoint, query, variables);
      
      return data.batchDataStoreds.map(event => ({
        id: event.id,
        logIds: event.logIds,
        creator: event.creator,
        dataType: event.dataType,
        timestamp: parseInt(event.timestamp),
        date: new Date(parseInt(event.timestamp) * 1000).toLocaleString(),
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        source: 'thegraph',
        isBatch: true
      }));
    } catch (error) {
      console.error('Query batch data stored events failed:', error);
      throw new Error(`The Graph query failed: ${error.message}`);
    }
  }

  // 获取统计信息
  async getStatistics() {
    if (!this.currentEndpoint) {
      throw new Error('The Graph endpoint not configured');
    }

    const query = gql`
      query GetStatistics {
        dataStoreds(first: 1000) {
          id
          creator
          dataType
        }
      }
    `;

    try {
      const data = await request(this.currentEndpoint, query);
      const events = data.dataStoreds;
      
      // 计算统计信息
      const totalRecords = events.length;
      const uniqueCreators = new Set(events.map(e => e.creator)).size;
      const dataTypes = events.reduce((acc, e) => {
        acc[e.dataType] = (acc[e.dataType] || 0) + 1;
        return acc;
      }, {});

      return {
        totalRecords,
        uniqueCreators,
        dataTypes,
        mostCommonType: Object.keys(dataTypes).reduce((a, b) => 
          dataTypes[a] > dataTypes[b] ? a : b, Object.keys(dataTypes)[0]
        )
      };
    } catch (error) {
      console.error('Get statistics failed:', error);
      throw new Error(`The Graph query failed: ${error.message}`);
    }
  }

  // 获取最近的数据（用于实时更新）
  async getRecentData(sinceTimestamp, first = 20) {
    if (!this.currentEndpoint) {
      throw new Error('The Graph endpoint not configured');
    }

    const query = gql`
      query GetRecentData($sinceTimestamp: Int!, $first: Int!) {
        dataStoreds(
          where: { timestamp_gte: $sinceTimestamp }
          first: $first
          orderBy: timestamp
          orderDirection: desc
        ) {
         id
          logId
          creator
          dataType
          content
          timestamp
          dataHash
          blockNumber
          transactionHash
          value
          toAddress
          fromAddress
          transactionHash
          blockNumber
          contractAddress
          inputData
          onChainContent
          transactionTime
          transactionFee
          gasPrice
        }
      }
    `;

    try {
      const variables = { sinceTimestamp, first };
      const data = await request(this.currentEndpoint, query, variables);
      
      return data.dataStoreds.map(event => ({
        id: event.id,
        logId: event.logId,
        creator: event.creator,
        dataType: event.dataType,
        content: event.content,
        timestamp: parseInt(event.timestamp),
        date: new Date(parseInt(event.timestamp) * 1000).toLocaleString(),
        dataHash: event.dataHash,
        blockNumber: event.blockNumber,
        txHash: event.transactionHash,
        value: event.value,
        toAddress: event.toAddress,
        fromAddress: event.fromAddress,
        contractAddress: event.contractAddress,
        inputData: event.inputData,
        onChainContent: event.onChainContent,
        transactionTime: event.transactionTime,
        transactionFee: event.transactionFee,
        gasPrice: event.gasPrice,
        source: 'thegraph'
      }));
    } catch (error) {
      console.error('Get recent data failed:', error);
      throw new Error(`The Graph query failed: ${error.message}`);
    }
  }

  // 健康检查
  async healthCheck() {
    if (!this.currentEndpoint) {
      return { status: 'not_configured', message: 'No endpoint configured' };
    }

    try {
      const query = gql`
        query HealthCheck {
          _meta {
            block {
              number
              hash
            }
          }
        }
      `;
      
      const data = await request(this.currentEndpoint, query);
      return { 
        status: 'healthy', 
        block: data._meta.block,
        endpoint: this.currentEndpoint 
      };
    } catch (error) {
      return { 
        status: 'error', 
        message: error.message,
        endpoint: this.currentEndpoint 
      };
    }
  }
}

export default TheGraphService;