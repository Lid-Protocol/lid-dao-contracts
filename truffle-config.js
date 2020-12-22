const {privateKey, publicKey} = require("./privatekey")

module.exports = require("@aragon/os/truffle-config.js");

module.exports.networks.mainnet.gasPrice = 61e9;

module.exports.compilers = {
  solc: {
    version: "0.4.24",
    docker: false,
    settings: {
     optimizer: {
       enabled: true,
       runs: 200
     },
     evmVersion: "byzantium"
    }
  }
}