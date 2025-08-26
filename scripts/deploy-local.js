#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Mask Truffle AI - 本地合约部署工具');
console.log('=====================================\n');

async function checkGanacheRunning() {
  return new Promise((resolve) => {
    exec('netstat -an | findstr :7545', (error, stdout) => {
      resolve(stdout.includes(':7545'));
    });
  });
}

async function deployContracts() {
  console.log('📋 部署步骤:');
  console.log('1. 检查 Ganache 是否运行');
  console.log('2. 编译合约');
  console.log('3. 部署合约到本地链');
  console.log('4. 更新前端配置\n');

  // 检查 Ganache 是否运行
  console.log('🔍 检查 Ganache 状态...');
  const isGanacheRunning = await checkGanacheRunning();
  
  if (!isGanacheRunning) {
    console.log('⚠️  Ganache 未运行！');
    console.log('\n启动选项:');
    console.log('选项1 - 使用 Ganache CLI:');
    console.log('  npm run ganache');
    console.log('\n选项2 - 手动启动:');
    console.log('  ganache --deterministic --accounts 10 --host 127.0.0.1 --port 8545');
    console.log('\n启动 Ganache 后，请重新运行此脚本。');
    return;
  }

  console.log('✅ Ganache 正在运行');

  // 编译合约
  console.log('\n📦 编译合约...');
  await executeCommand('npx truffle compile');

  // 部署合约
  console.log('\n🚀 部署合约到 Ganache...');
  await executeCommand('npx truffle migrate --network ganache --reset');

  // 读取部署结果
  const deploymentFile = path.join(__dirname, '..', 'deployments', 'ganache.json');
  if (fs.existsSync(deploymentFile)) {
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    console.log('\n🎉 部署成功！');
    console.log(`📍 合约地址: ${deployment.contractAddress}`);
    console.log(`🔢 网络ID: ${deployment.networkId}`);
    
    // 更新前端配置提醒
    console.log('\n⚠️  下一步：更新前端配置');
    console.log(`请将以下地址添加到 client/src/services/LogChainService.js:`);
    console.log(`'ganache': '${deployment.contractAddress}',`);
    console.log(`'${deployment.networkId}': 'ganache',`);
  }

  console.log('\n✨ 部署完成！现在可以使用日志上链功能了。');
}

function executeCommand(command) {
  return new Promise((resolve, reject) => {
    const process = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ 命令执行失败: ${command}`);
        console.error(error.message);
        reject(error);
        return;
      }
      resolve(stdout);
    });

    process.stdout.on('data', (data) => {
      console.log(data.toString().trim());
    });

    process.stderr.on('data', (data) => {
      console.error(data.toString().trim());
    });
  });
}

// 运行部署
deployContracts().catch(console.error);