const fs = require('fs');
const path = require('path');

module.exports = async function(deployer, network) {
  // 只部署DataLogContract，因为这是我们需要的合约
  const DataLogContract = artifacts.require("DataLogContract");
  
  console.log(`\n🚀 Deploying DataLogContract to ${network} network...`);
  console.log(`📡 Network Info: ${network}`);
  
  try {
    // 部署数据日志合约
    console.log(`📦 Deploying DataLogContract...`);
    await deployer.deploy(DataLogContract);
    const dataLogInstance = await DataLogContract.deployed();
    
    console.log(`\n✅ DataLogContract deployed successfully!`);
    console.log(`📍 Contract Address: ${dataLogInstance.address}`);
    console.log(`🆔 Transaction Hash: ${dataLogInstance.transactionHash}`);
    console.log(`🌍 Network: ${network}`);
    
    // 获取网络ID
    const networkId = await web3.eth.net.getId();
    console.log(`🔢 Network ID: ${networkId}`);
    
    // 保存部署信息到文件
    const deploymentInfo = {
      network: network,
      networkId: networkId,
      contractName: 'DataLogContract',
      contractAddress: dataLogInstance.address,
      transactionHash: dataLogInstance.transactionHash,
      deployedAt: new Date().toISOString(),
      deployer: deployer.address || 'unknown'
    };
    
    // 创建部署信息文件
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir);
    }
    
    const deploymentFile = path.join(deploymentsDir, `${network}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    
    console.log(`💾 Deployment info saved to: ${deploymentFile}`);
    
    // 验证合约部署
    console.log(`\n🔍 Verifying contract deployment...`);
    const stats = await dataLogInstance.getStats();
    console.log(`📊 Contract stats - Total Logs: ${stats.totalLogs}, Contract Address: ${stats.contractAddress}`);
    
    // 提供前端配置更新提醒
    console.log(`\n⚠️  重要提醒:`);
    console.log(`请将以下合约地址更新到前端配置中:`);
    console.log(`\n📝 更新文件: client/src/services/LogChainService.js`);
    console.log(`📍 合约地址: ${dataLogInstance.address}`);
    console.log(`🔢 网络ID: ${networkId}`);
    
    if (network === 'ganache' || network === 'ganache_cli' || network === 'development') {
      console.log(`\n🔧 自动配置建议:`);
      console.log(`将 'ganache': '${dataLogInstance.address}' 添加到 DATA_LOG_CONTRACT_ADDRESSES 中`);
      console.log(`或将 '${networkId}': 'ganache' 添加到 networkNames 中`);
    }
    
    console.log(`\n🎉 部署完成！你现在可以在前端使用日志上链功能了。\n`);
    
  } catch (error) {
    console.error(`❌ Deployment failed:`, error);
    throw error;
  }
};