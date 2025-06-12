const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const CrowdFundModule = buildModule("CrowdFundModule", (m) => {
  const crowdFundContract = m.contract("CrowdFund");
  return { crowdFund: crowdFundContract };
});

module.exports = CrowdFundModule; 