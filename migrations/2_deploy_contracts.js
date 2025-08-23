const fs = require('fs');
const path = require('path');

module.exports = async function(deployer, network) {
  const DataStorage = artifacts.require("DataStorage");
  
  console.log(`\n🚀 Deploying DataStorage contract to ${network} network...`);
  
  try {
    // 部署合约
    await deployer.deploy(DataStorage);
    const dataStorageInstance = await DataStorage.deployed();
    
    console.log(`✅ DataStorage deployed successfully!`);
    console.log(`📍 Contract Address: ${dataStorageInstance.address}`);
    console.log(`🌍 Network: ${network}`);
    
    // 保存部署信息到文件
    const deploymentInfo = {
      network: network,
      contractAddress: dataStorageInstance.address,
      deployedAt: new Date().toISOString(),
      transactionHash: dataStorageInstance.transactionHash
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
    console.log(`文件: client/src/services/DataStorageService.js`);
    console.log(`将 CONTRACT_ADDRESS 设置为: ${dataStorageInstance.address}`);
    console.log(`\n或者在 .env 文件中设置:`);
    console.log(`REACT_APP_CONTRACT_ADDRESS=${dataStorageInstance.address}`);
    
    // 验证合约部署
    console.log(`\n🔍 Verifying contract deployment...`);
    const stats = await dataStorageInstance.getStats();
    console.log(`📊 Initial stats - Total: ${stats.total}, Active: ${stats.active}`);
    
    console.log(`\n🎉 Deployment completed successfully!\n`);
    
  } catch (error) {
    console.error(`❌ Deployment failed:`, error);
    throw error;
  }
};
