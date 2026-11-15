const hre = require('hardhat');

async function main() {
  const address = process.env.CONTRACT_ADDRESS;
  if (!address) throw new Error('Set CONTRACT_ADDRESS env var');

  const contract = await hre.ethers.getContractAt('CollectibleCard', address);
  const tx = await contract.mintToIssuer(1);
  const receipt = await tx.wait();

  console.log('Minted, tx:', receipt.hash);
  console.log('nextTokenId now:', (await contract.nextTokenId()).toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
