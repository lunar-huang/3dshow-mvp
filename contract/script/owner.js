const hre = require('hardhat');

async function main() {
  const address = process.env.CONTRACT_ADDRESS;
  const tokenId = process.env.TOKEN_ID;
  if (!address || !tokenId) {
    throw new Error('Set CONTRACT_ADDRESS and TOKEN_ID env vars');
  }

  const contract = await hre.ethers.getContractAt('CollectibleCard', address);
  const owner = await contract.ownerOf(tokenId);
  console.log(`owner(${tokenId}) =`, owner);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
