import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CarbonCreditNFTModule = buildModule("CarbonCreditNFTModule", (m) => {
  const deployer = m.getAccount(0);
  const carbonCreditNFT = m.contract("CarbonCreditNFT", [deployer], {
    from: deployer,
  });
  return { carbonCreditNFT };
});

export default CarbonCreditNFTModule;
