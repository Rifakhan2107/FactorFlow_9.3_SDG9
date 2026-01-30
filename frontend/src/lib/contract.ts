import { Contract, BrowserProvider, Signer } from "ethers";
import CarbonCreditNFTAbi from "./contracts/CarbonCreditNFT.json";

const CONTRACT_ADDRESS =
  import.meta.env.VITE_CARBON_CREDIT_NFT_ADDRESS || "";

export const CHAIN_ID_LOCAL = 31337;
export const CHAIN_ID_SEPOLIA = 11155111;

export function getContractAddress(): string {
  return CONTRACT_ADDRESS;
}

export function getCarbonCreditNFTContract(signer: Signer): Contract {
  const address = getContractAddress();
  if (!address) {
    throw new Error("VITE_CARBON_CREDIT_NFT_ADDRESS is not set");
  }
  return new Contract(address, CarbonCreditNFTAbi as string[], signer);
}

export async function getProvider(): Promise<BrowserProvider> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not installed");
  }
  return new BrowserProvider(window.ethereum);
}

export async function getSigner(): Promise<Signer> {
  const provider = await getProvider();
  return provider.getSigner();
}

declare global {
  interface Window {
    ethereum?: unknown;
  }
}
