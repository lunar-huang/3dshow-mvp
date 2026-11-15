import { ethers } from 'ethers';

const ABI = [
  'function issuer() view returns (address)',
  'function ownerOf(uint256) view returns (address)',
  'function currentVersion(uint256) view returns (uint256)',
  'function nextTokenId() view returns (uint256)',
  'function claimTo(address user, uint256 tokenId)',
  'function setCurrentVersion(uint256 tokenId, uint256 version)',
];

let contract;

export function initChain() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
  const issuerWallet = new ethers.Wallet(process.env.ISSUER_PRIVATE_KEY, provider);
  contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, issuerWallet);
}

export async function deriveStatus(tokenId) {
  const [owner, issuerAddr] = await Promise.all([contract.ownerOf(tokenId), contract.issuer()]);
  return owner.toLowerCase() === issuerAddr.toLowerCase() ? 'UNCLAIMED' : 'CLAIMED';
}

export async function getOwner(tokenId) {
  return contract.ownerOf(tokenId);
}

export async function getIssuer() {
  return contract.issuer();
}

export async function getNextTokenId() {
  return Number(await contract.nextTokenId());
}

export async function claimTo(userWallet, tokenId) {
  const tx = await contract.claimTo(userWallet, tokenId);
  const receipt = await tx.wait();
  return receipt.hash;
}
