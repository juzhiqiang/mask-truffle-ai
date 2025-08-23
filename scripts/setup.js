#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Mask Truffle AI 项目设置脚本');
console.log('==================================\n');

// 检查 Node.js 版本
const nodeVersion = process.version;
console.log(`📦 Node.js 版本: ${nodeVersion}`);

if (parseInt(nodeVersion.split('.')[0].substring(1)) < 16) {
  console.error('❌ 需要 Node.js 16 或更高版本');
  process.exit(1);
}

// 检查是否安装了 npm
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`📦 npm 版本: ${npmVersion}`);
} catch (error) {
  console.error('❌ 未找到 npm，请先安装 Node.js');
  process.exit(1);
}

// 检查是否安装了 Truffle
try {
  const truffleVersion = execSync('truffle version', { encoding: 'utf8' });
  console.log('✅ Truffle 已安装');
} catch (error) {
  console.log('⚠️  Truffle 未安装，正在安装...');
  try {
    execSync('npm install -g truffle', { stdio: 'inherit' });
    console.log('✅ Truffle 安装完成');
  } catch (installError) {
    console.error('❌ Truffle 安装失败，请手动安装: npm install -g truffle');
  }
}

// 检查是否安装了 Ganache CLI
try {
  execSync('ganache --version', { encoding: 'utf8' });
  console.log('✅ Ganache CLI 已安装');
} catch (error) {
  console.log('⚠️  Ganache CLI 未安装，正在安装...');
  try {
    execSync('npm install -g ganache', { stdio: 'inherit' });
    console.log('✅ Ganache CLI 安装完成');
  } catch (installError) {
    console.error('❌ Ganache CLI 安装失败，请手动安装: npm install -g ganache');
  }
}

console.log('\n📋 开始项目设置...\n');

// 安装根目录依赖
console.log('📦 安装根目录依赖...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ 根目录依赖安装完成');
} catch (error) {
  console.error('❌ 根目录依赖安装失败');
  process.exit(1);
}

// 安装客户端依赖
console.log('\n📦 安装客户端依赖...');
try {
  execSync('cd client && npm install', { stdio: 'inherit' });
  console.log('✅ 客户端依赖安装完成');
} catch (error) {
  console.error('❌ 客户端依赖安装失败');
  process.exit(1);
}

// 创建 .env 文件
const envPath = '.env';
if (!fs.existsSync(envPath)) {
  console.log('\n📄 创建环境变量文件...');
  fs.copyFileSync('.env.example', envPath);
  console.log('✅ .env 文件已创建');
  console.log('⚠️  请编辑 .env 文件，填入您的 Infura Project ID 和钱包助记词');
} else {
  console.log('✅ .env 文件已存在');
}

// 编译合约
console.log('\n🔨 编译智能合约...');
try {
  execSync('truffle compile', { stdio: 'inherit' });
  console.log('✅ 合约编译完成');
} catch (error) {
  console.error('❌ 合约编译失败');
  console.error('请检查 Solidity 编译器版本和合约代码');
}

console.log('\n🎉 项目设置完成！\n');

console.log('📚 接下来的步骤:');
console.log('1. 编辑 .env 文件，填入必要的配置信息');
console.log('2. 启动本地区块链: ganache');
console.log('3. 部署合约: npm run migrate');
console.log('4. 更新前端配置中的合约地址');
console.log('5. 启动前端应用: npm run dev\n');

console.log('🔗 有用的命令:');
console.log('• npm run compile     - 编译合约');
console.log('• npm run migrate     - 部署合约');
console.log('• npm run test        - 运行测试');
console.log('• npm run dev         - 启动前端');
console.log('• npm run build       - 构建前端\n');

console.log('📖 更多信息请查看 README.md 文件');
console.log('🐛 遇到问题？请查看 GitHub Issues: https://github.com/juzhiqiang/mask-truffle-ai/issues\n');

// 检查是否需要创建部署目录
const deploymentsDir = 'deployments';
if (!fs.existsSync(deploymentsDir)) {
  fs.mkdirSync(deploymentsDir);
  console.log('✅ 创建部署信息目录');
}

console.log('🚀 准备就绪！开始您的区块链开发之旅吧！');
