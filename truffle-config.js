const HDWalletProvider = require('@truffle/hdwallet-provider');

require('dotenv').config();
console.log(process.env.INFURA_PROJECT_ID,"❀")
module.exports = {
  networks: {
    development: {
      host: '127.0.0.1',
      port: 7545, // Ganache GUI 默认端口
      network_id: '*',
      gas: 6721975,
      gasPrice: 20000000000,
    },
    sepolia: {
      provider: () =>
        new HDWalletProvider(
          [process.env.PRIVATE_KEY], 
          `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
          0, // address_index
          1, // num_addresses
          true, // shareNonce
          "m/44'/60'/0'/0/" // derivationPath
        ),
      network_id: 11155111,
    },
    mainnet: {
      provider: () =>
        new HDWalletProvider(
          process.env.MNEMONIC,
          `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
        ),
      network_id: 1,
      gas: 4000000,
      gasPrice: 20000000000,
    },
  },
  compilers: {
    solc: {
      version: '0.8.19',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
  db: {
    enabled: false,
  },
};
