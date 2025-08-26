const LogStorage = artifacts.require("LogStorage");

module.exports = function(deployer) {
  deployer.deploy(LogStorage);
};