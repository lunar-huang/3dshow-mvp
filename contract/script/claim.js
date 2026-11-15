const hre = require('hardhat');

async function main() {
  const address = process.env.CONTRACT_ADDRESS;
  const tokenId = process.env.TOKEN_ID;
  const userAddress = process.env.USER_ADDRESS;
  if (!address || !tokenId || !userAddress) {
    throw new Error('Set CONTRACT_ADDRESS, TOKEN_ID and USER_ADDRESS env vars');
  }

  const contract = await hre.ethers.getContractAt('CollectibleCard', address);
  const tx = await contract.claimTo(userAddress, tokenId);
  const receipt = await tx.wait();

  console.log('Claimed, tx:', receipt.hash);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
