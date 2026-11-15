const hre = require('hardhat');

async function main() {
  const Factory = await hre.ethers.getContractFactory('CollectibleCard');
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  console.log('CollectibleCard deployed to:', await contract.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
