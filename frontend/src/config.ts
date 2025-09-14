// Frontend runtime configuration helpers for networks & addresses.

export type Network = 'sepolia' | 'local' | 'mainnet' | 'unknown';

export function currentMode() {
  return import.meta.env.MODE as 'development' | 'production' | string;
}

export function forcedNetwork(): Network | undefined {
  const f = import.meta.env.VITE_FORCE_CHAIN as string | undefined; // 'sepolia' | 'local' | 'mainnet'
  if (!f) return undefined;
  if (f === 'sepolia' || f === 'local' || f === 'mainnet') return f;
  return 'unknown';
}

export function pickNetwork(): Network {
  const forced = forcedNetwork();
  if (forced && forced !== 'unknown') return forced;
  const chainIdHex = (typeof window !== 'undefined' ? (window as any)?.ethereum?.chainId : undefined) as string | undefined;
  if (chainIdHex) {
    const id = Number(chainIdHex);
    if (id === 11155111) return 'sepolia';
    if (id === 31337) return 'local';
    if (id === 1) return 'mainnet';
    return 'unknown';
  }
  // No wallet: default by mode
  return currentMode() === 'production' ? 'sepolia' : 'local';
}

export function rpcUrl(): string | undefined {
  const net = pickNetwork();
  if (import.meta.env.VITE_RPC_HTTP) return import.meta.env.VITE_RPC_HTTP as string;
  if (net === 'sepolia' && import.meta.env.VITE_RPC_HTTP_SEPOLIA) return import.meta.env.VITE_RPC_HTTP_SEPOLIA as string;
  if (net === 'local' && import.meta.env.VITE_RPC_HTTP_LOCAL) return import.meta.env.VITE_RPC_HTTP_LOCAL as string;
  return undefined;
}

export function ensRegistryAddress(): `0x${string}` | undefined {
  // Must be provided for non-mainnet if you actually want to write ENS
  const v = import.meta.env.VITE_ENS_REGISTRY as string | undefined;
  return v as any;
}

export function poolAddress(): `0x${string}` | undefined {
  const env = (import.meta.env.VITE_POOL_ADDRESS as string | undefined) as `0x${string}` | undefined;
  if (env) return env;
  // For local dev, fallback to deployments JSON via Vite alias import in Events.tsx; here just undefined
  return undefined;
}

