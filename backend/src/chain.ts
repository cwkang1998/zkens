import { createPublicClient, createWalletClient, encodeFunctionData, http } from 'viem';
import { hardhat } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const POOL_ABI = [
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'payable',
    inputs: [{ name: 'commitment', type: 'bytes32' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'withdraw',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'nullifier', type: 'bytes32' },
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'relayer', type: 'address' },
      { name: 'fee', type: 'uint256' },
      { name: 'proof', type: 'bytes' },
      { name: 'publicInputs', type: 'bytes32[]' },
    ],
    outputs: [],
  },
] as const;

let cachedPoolAddress: `0x${string}` | undefined;

export async function getPoolAddress(): Promise<`0x${string}` | undefined> {
  if (cachedPoolAddress) return cachedPoolAddress;
  const fromEnv = process.env.BACKEND_POOL_ADDRESS as `0x${string}` | undefined;
  if (fromEnv) {
    cachedPoolAddress = fromEnv;
    return cachedPoolAddress;
  }
  const deploymentsPath = process.env.BACKEND_DEPLOYMENTS_PATH || path.resolve(__dirname, '../../contracts/deployments/local.json');
  try {
    const raw = await fs.readFile(deploymentsPath, 'utf8');
    const json = JSON.parse(raw);
    if (json?.shieldedPool) {
      cachedPoolAddress = json.shieldedPool as `0x${string}`;
      return cachedPoolAddress;
    }
  } catch {}
  return undefined;
}

export function getPublicClient() {
  const rpc = process.env.BACKEND_RPC_URL || 'http://127.0.0.1:8545';
  return createPublicClient({ chain: hardhat, transport: http(rpc) });
}

export function getWalletClient() {
  const rpc = process.env.BACKEND_RPC_URL || 'http://127.0.0.1:8545';
  const pk = process.env.BACKEND_PRIVATE_KEY;
  if (!pk) return undefined;
  const account = privateKeyToAccount(pk as `0x${string}`);
  return { account, client: createWalletClient({ chain: hardhat, transport: http(rpc), account }) };
}

export async function onchainDeposit(commitmentHex: string, amountWei: bigint): Promise<`0x${string}` | undefined> {
  const pool = await getPoolAddress();
  const wallet = getWalletClient();
  if (!pool || !wallet) return undefined;
  const data = encodeFunctionData({ abi: POOL_ABI, functionName: 'deposit', args: [commitmentHex as `0x${string}`] });
  const hash = await wallet.client.sendTransaction({ account: wallet.account, to: pool, data, value: amountWei });
  const publicClient = getPublicClient();
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export async function onchainWithdraw(amountWei: bigint, recipient: `0x${string}`): Promise<`0x${string}` | undefined> {
  const pool = await getPoolAddress();
  const wallet = getWalletClient();
  if (!pool || !wallet) return undefined;
  // Use a unique random nullifier for demo purposes
  const nullifier = ('0x' + crypto.randomBytes(32).toString('hex')) as `0x${string}`;
  const zeroAddr = '0x0000000000000000000000000000000000000000';
  const data = encodeFunctionData({
    abi: POOL_ABI,
    functionName: 'withdraw',
    args: [nullifier, recipient, amountWei, zeroAddr, 0n, '0x', []],
  });
  const hash = await wallet.client.sendTransaction({ account: wallet.account, to: pool, data, value: 0n });
  const publicClient = getPublicClient();
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
