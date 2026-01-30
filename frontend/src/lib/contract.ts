import { Contract, BrowserProvider, Signer, ContractFactory } from "ethers";
import CarbonCreditNFTAbi from "./contracts/CarbonCreditNFT.json";

const CONTRACT_ADDRESS =
  import.meta.env.VITE_CARBON_CREDIT_NFT_ADDRESS || "";

export const CHAIN_ID_LOCAL = 31337;
export const CHAIN_ID_SEPOLIA = 11155111;

export function getContractAddress(): string {
  return CONTRACT_ADDRESS;
}

export function getCarbonCreditNFTContract(signer: Signer, address?: string): Contract {
  const addr = address || getContractAddress();
  if (!addr) {
    throw new Error("Contract address is required (pass address or set VITE_CARBON_CREDIT_NFT_ADDRESS)");
  }
  return new Contract(addr, CarbonCreditNFTAbi.abi, signer);
}

export function getCarbonCreditNFTFactory(signer: Signer): ContractFactory {
  const abi = CarbonCreditNFTAbi.abi as any;
  const bytecode = (CarbonCreditNFTAbi as any).bytecode;
  if (!bytecode) {
    throw new Error("CarbonCreditNFT bytecode not found in artifact");
  }
  return new ContractFactory(abi, bytecode, signer);
}

export async function getProvider(): Promise<BrowserProvider> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not installed");
  }
  return new BrowserProvider(window.ethereum as any);
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
