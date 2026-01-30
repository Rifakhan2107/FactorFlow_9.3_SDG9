import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { BrowserProvider, Signer } from "ethers";
import { getCarbonCreditNFTContract, getContractAddress, CHAIN_ID_LOCAL } from "@/lib/contract";
import type { Contract } from "ethers";

interface WalletContextType {
  account: string | null;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signer: Signer | null;
  provider: BrowserProvider | null;
  contract: Contract | null;
  refreshAccount: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const TARGET_CHAIN_ID = CHAIN_ID_LOCAL;

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [signer, setSigner] = useState<Signer | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshAccount = useCallback(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    (window.ethereum as { request: (args: { method: string }) => Promise<string[]> })
      .request({ method: "eth_accounts" })
      .then((accounts: string[]) => {
        if (accounts.length > 0) setAccount(accounts[0]);
        else setAccount(null);
      })
      .catch(() => setAccount(null));
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setError("MetaMask not installed");
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const eth = window.ethereum as {
        request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      };
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      if (accounts.length === 0) {
        setError("No account selected");
        setIsConnecting(false);
        return;
      }
      const prov = new BrowserProvider(eth);
      const net = await prov.getNetwork();
      setChainId(Number(net.chainId));
      if (Number(net.chainId) !== TARGET_CHAIN_ID) {
        try {
          await eth.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${TARGET_CHAIN_ID.toString(16)}` }],
          });
        } catch (switchErr: unknown) {
          const msg = switchErr instanceof Error ? switchErr.message : "Failed to switch chain";
          setError(`Please switch to localhost (${TARGET_CHAIN_ID}) in MetaMask. ${msg}`);
        }
      }
      const sig = await prov.getSigner();
      setSigner(sig);
      setProvider(prov);
      setAccount(accounts[0]);
      const addr = getContractAddress();
      if (addr) {
        const c = getCarbonCreditNFTContract(sig);
        setContract(c);
      } else {
        setContract(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect wallet";
      setError(message);
      setAccount(null);
      setSigner(null);
      setProvider(null);
      setContract(null);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setChainId(null);
    setSigner(null);
    setProvider(null);
    setContract(null);
    setError(null);
  }, []);

  useEffect(() => {
    refreshAccount();
    if (!window.ethereum) return;
    const eth = window.ethereum as { on: (event: string, cb: () => void) => void };
    eth.on("accountsChanged", () => {
      refreshAccount();
      if (account === null) disconnect();
    });
    eth.on("chainChanged", () => window.location.reload());
  }, [refreshAccount, account, disconnect]);

  useEffect(() => {
    if (account && signer && getContractAddress()) {
      setContract(getCarbonCreditNFTContract(signer));
    } else {
      setContract(null);
    }
  }, [account, signer]);

  return (
    <WalletContext.Provider
      value={{
        account,
        chainId,
        isConnecting,
        error,
        connect,
        disconnect,
        signer,
        provider,
        contract,
        refreshAccount,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
