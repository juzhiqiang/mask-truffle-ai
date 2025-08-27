#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Mask Truffle AI - 本地合约部署工具');
console.log('=====================================\n');

async function checkGanacheRunning() {
  return new Promise((resolve) => {
    exec('netstat -an | findstr :7545', (error, stdout) => {
      const port7545 = stdout.includes(':7545');
      if (!port7545) {
        // 也检查8545端口
        exec('netstat -an | findstr :8545', (error, stdout) => {
          resolve(stdout.includes(':8545'));
        });
      } else {
        resolve(true);
      }
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
    console.log('选项1 - 使用 Ganache CLI (推荐):');
    console.log('  npx ganache --deterministic --accounts 10 --host 127.0.0.1 --port 7545');
    console.log('\n选项2 - 使用项目脚本:');
    console.log('  npm run ganache');
    console.log('\n启动 Ganache 后，请重新运行此脚本。');
    return;
  }

  console.log('✅ Ganache 正在运行');

  // 编译合约
  console.log('\n📦 编译合约...');
  try {
    await executeCommand('npx truffle compile');
  } catch (error) {
    console.error('❌ 编译失败，尝试清理后重新编译...');
    try {
      await executeCommand('npx truffle compile --all');
    } catch (retryError) {
      console.error('❌ 编译仍然失败，请检查合约代码');
      return;
    }
  }

  // 部署合约 - 尝试多种网络配置
  console.log('\n🚀 部署合约到本地链...');
  let deploymentSuccess = false;
  let deploymentResult = null;

  // 尝试不同的网络配置
  const networkOptions = [
    'development',
    'ganache', 
    'ganache_cli'
  ];

  for (const network of networkOptions) {
    try {
      console.log(`\n🔄 尝试部署到 ${network} 网络...`);
      deploymentResult = await executeCommand(`npx truffle migrate --network ${network} --reset`);
      deploymentSuccess = true;
      console.log(`✅ 成功部署到 ${network} 网络`);
      
      // 读取部署结果
      const deploymentFile = path.join(__dirname, '..', 'deployments', `${network}.json`);
      if (fs.existsSync(deploymentFile)) {
        const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
        console.log('\n🎉 部署成功！');
        console.log(`📍 合约地址: ${deployment.contractAddress}`);
        console.log(`🔢 网络ID: ${deployment.networkId}`);
        console.log(`🌐 网络: ${network}`);
        
        // 更新前端配置提醒
        console.log('\n⚠️  下一步：更新前端配置');
        console.log(`请将以下地址添加到 client/src/services/LogChainService.js:`);
        console.log(`\n在 DATA_LOG_CONTRACT_ADDRESSES 中添加:`);
        console.log(`'ganache': '${deployment.contractAddress}',`);
        console.log(`'${deployment.networkId}': 'ganache',`);
        
        console.log('\n📝 或者手动编辑配置文件：');
        console.log(`文件：client/src/services/LogChainService.js`);
        console.log(`位置：DATA_LOG_CONTRACT_ADDRESSES 对象`);
      }
      break;
    } catch (error) {
      console.log(`⚠️  ${network} 网络部署失败，尝试下一个网络...`);
    }
  }

  if (!deploymentSuccess) {
    console.error('\n❌ 所有网络部署都失败了');
    console.log('\n🔧 手动部署建议：');
    console.log('1. 确保 Ganache 在端口 7545 或 8545 运行');
    console.log('2. 检查 truffle-config.js 中的网络配置');
    console.log('3. 尝试手动运行：npx truffle migrate --network development --reset');
    console.log('4. 如果仍然失败，检查 Ganache 控制台的错误信息');
    return;
  }

  console.log('\n✨ 部署完成！现在可以使用日志上链功能了。');
  console.log('\n🚀 下一步：');
  console.log('1. 更新前端配置（见上面的说明）');
  console.log('2. 启动前端：npm run dev');
  console.log('3. 连接钱包到本地网络');
  console.log('4. 测试日志上链功能');
}

function executeCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`▶️  执行: ${command}`);
    const process = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ 命令执行失败: ${command}`);
        console.error(`错误信息: ${error.message}`);
        if (stderr) {
          console.error(`stderr: ${stderr}`);
        }
        reject(error);
        return;
      }
      resolve(stdout);
    });

    process.stdout.on('data', (data) => {
      console.log(data.toString().trim());
    });

    process.stderr.on('data', (data) => {
      const errorMsg = data.toString().trim();
      // 过滤掉已知的警告信息
      if (!errorMsg.includes('µWS is not compatible') && 
          !errorMsg.includes('performance may be degraded') &&
          !errorMsg.includes('uws_win32_x64')) {
        console.error(errorMsg);
      }
    });
  });
}

// 添加错误处理
process.on('uncaughtException', (error) => {
  console.error('\n❌ 未捕获的异常:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ 未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 运行部署
deployContracts().catch((error) => {
  console.error('\n❌ 部署过程出错:', error.message);
  process.exit(1);
});