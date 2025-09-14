import { createPublicClient, createWalletClient, http, custom } from 'viem';
import { mainnet, sepolia, hardhat } from 'viem/chains';
import { pickNetwork, rpcUrl } from './config';

// Basic web3 helpers using viem.

export type Web3Clients = {
  publicClient: any;
  walletClient?: any;
};

// Resolve a chain to use:
// - Prefer injected wallet chain
// - Fallback to env RPC via Vite vars
// - Fallback to mainnet for ENS reads
export function getChain() {
  const net = pickNetwork();
  if (net === 'sepolia') return sepolia;
  if (net === 'local') return hardhat;
  if (net === 'mainnet') return mainnet;
  // Unknown: try injected id
  const injectedChainId = (window as any)?.ethereum?.chainId as string | undefined;
  if (injectedChainId) {
    const id = Number(injectedChainId);
    if (id === 1) return mainnet;
    if (id === 11155111) return sepolia;
    if (id === 31337) return hardhat;
    return { ...mainnet, id, name: `Chain ${id}` } as any;
  }
  // Fallback: prefer sepolia
  return sepolia;
}

export function getPublicClient() {
  const chain = getChain();
  const rpc = rpcUrl();
  return createPublicClient({
    chain,
    transport: rpc ? http(rpc) : (typeof window !== 'undefined' && (window as any).ethereum ? custom((window as any).ethereum) : http()),
  });
}

export async function getWalletClient() {
  const eth = (window as any).ethereum;
  if (!eth) return undefined;
  const chain = getChain();
  return createWalletClient({
    chain,
    transport: custom(eth),
  });
}

export async function connectWallet(): Promise<`0x${string}`[]> {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error('No injected wallet found');
  const accounts: `0x${string}`[] = await eth.request({ method: 'eth_requestAccounts' });
  return accounts;
}

export function watchWallet(
  onChange: (accounts: `0x${string}`[], chainIdHex: string) => void
) {
  const eth = (window as any).ethereum;
  if (!eth) return () => {};
  const handleAccountsChanged = (accs: string[]) => {
    onChange(accs as `0x${string}`[], eth.chainId as string);
  };
  const handleChainChanged = (chainId: string) => {
    onChange((eth.selectedAddress ? [eth.selectedAddress] : []) as `0x${string}`[], chainId);
  };
  eth.on?.('accountsChanged', handleAccountsChanged);
  eth.on?.('chainChanged', handleChainChanged);
  return () => {
    try {
      eth.removeListener?.('accountsChanged', handleAccountsChanged);
      eth.removeListener?.('chainChanged', handleChainChanged);
    } catch {}
  };
}
