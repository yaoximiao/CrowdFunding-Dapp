// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  console.log("正在部署 CrowdFund 合约...");

  // 1. 部署合约
  // deployContract 是一个辅助函数，它封装了 getContractFactory 和 deploy
  // 它的第二个参数是合约构造函数的参数数组，这里我们的构造函数没有参数，所以是空数组 []
  const crowdFund = await hre.ethers.deployContract("CrowdFund", []);

  // 2. 等待部署完成
  // waitForDeployment 会等待交易被确认
  await crowdFund.waitForDeployment();

  // 3. 打印合约地址
  // .target 是 ethers v6 中获取合约地址的推荐方式
  console.log(`CrowdFund contract deployed to: ${crowdFund.target}`);
}

// 推荐使用这种模式，以便能够正确处理错误
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});