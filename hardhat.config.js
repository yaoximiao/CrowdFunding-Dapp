// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox"); // <--- 添加这一行！

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28", // 确保你的合约 Solidity 版本与此兼容或适当调整
  // 你也可以在这里添加 networks 等其他配置，但对于本地测试，toolbox 默认配置通常足够
};