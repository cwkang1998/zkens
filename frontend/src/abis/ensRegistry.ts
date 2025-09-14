export const ENS_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'resolver',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: 'resolver', type: 'address' }],
  },
] as const;

// Mainnet ENS registry (override via env if needed)
export const ENS_REGISTRY_ADDRESS_MAINNET = (import.meta as any).env?.VITE_ENS_REGISTRY || '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
