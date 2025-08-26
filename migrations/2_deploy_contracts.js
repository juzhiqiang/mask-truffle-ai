const fs = require('fs');
const path = require('path');

module.exports = async function(deployer, network) {
  const DataStorage = artifacts.require("DataStorage");
  const DataLogContract = artifacts.require("DataLogContract");
  
  console.log(`\n🚀 Deploying contracts to ${network} network...`);
  
  try {
    // 部署原有的DataStorage合约
    console.log(`📦 Deploying DataStorage contract...`);
    await deployer.deploy(DataStorage);
    const dataStorageInstance = await DataStorage.deployed();
    
    console.log(`✅ DataStorage deployed successfully!`);
    console.log(`📍 DataStorage Address: ${dataStorageInstance.address}`);
    
    // 部署新的数据日志合约
    console.log(`📦 Deploying DataLogContract...`);
    await deployer.deploy(DataLogContract);
    const dataLogInstance = await DataLogContract.deployed();
    
    console.log(`✅ DataLogContract deployed successfully!`);
    console.log(`📍 DataLogContract Address: ${dataLogInstance.address}`);
    console.log(`🌍 Network: ${network}`);
    
    // 保存部署信息到文件
    const deploymentInfo = {
      network: network,
      contracts: {
        DataStorage: {
          address: dataStorageInstance.address,
          transactionHash: dataStorageInstance.transactionHash
        },
        DataLogContract: {
          address: dataLogInstance.address,
          transactionHash: dataLogInstance.transactionHash
        }
      },
      deployedAt: new Date().toISOString()
    };
    
    // 创建部署信息文件
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir);
    }
    
    const deploymentFile = path.join(deploymentsDir, `${network}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`💾 Deployment info saved to: ${deploymentFile}`);
    
    // 更新前端配置提醒
    console.log(`\n⚠️  重要提醒:`);
    console.log(`请将合约地址更新到前端配置中:`);
    console.log(`\n📝 DataStorage合约:`);
    console.log(`文件: client/src/services/DataStorageService.js`);
    console.log(`将 CONTRACT_ADDRESS 设置为: ${dataStorageInstance.address}`);
    console.log(`\n📝 DataLogContract合约:`);
    console.log(`文件: client/src/services/LogChainService.js`);
    console.log(`将对应网络的合约地址设置为: ${dataLogInstance.address}`);
    
    console.log(`\n或者在 .env 文件中设置:`);
    console.log(`REACT_APP_DATA_STORAGE_ADDRESS=${dataStorageInstance.address}`);
    console.log(`REACT_APP_DATA_LOG_ADDRESS=${dataLogInstance.address}`);
    
    // 验证合约部署
    console.log(`\n🔍 Verifying contract deployment...`);
    
    // 验证DataStorage
    const dataStorageStats = await dataStorageInstance.getStats();
    console.log(`📊 DataStorage stats - Total: ${dataStorageStats.total}, Active: ${dataStorageStats.active}`);
    
    // 验证DataLogContract
    const dataLogStats = await dataLogInstance.getStats();
    console.log(`📊 DataLogContract stats - Total Logs: ${dataLogStats.totalLogs}, Contract: ${dataLogStats.contractAddress}`);
    
    console.log(`\n🎉 All contracts deployed successfully!\n`);
    
  } catch (error) {
    console.error(`❌ Deployment failed:`, error);
    throw error;
  }
};