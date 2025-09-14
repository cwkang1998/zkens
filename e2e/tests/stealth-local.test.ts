import { describe, it, expect, beforeAll } from 'vitest';
import { createPublicClient, getAbiItem, http, parseAbiItem } from 'viem';
import { hardhat } from 'viem/chains';
import fs from 'node:fs/promises';

async function readJson<T = any>(path: string): Promise<T> {
  const raw = await fs.readFile(path, 'utf-8');
  return JSON.parse(raw) as T;
}

const BACKEND = process.env.BACKEND_URL?.replace(/\/$/, '') || 'http://localhost:3001';
const RPC = process.env.RPC_URL || 'http://127.0.0.1:8545';

describe('Local stealth + shielding flow', () => {
  let startBlock: bigint;
  let poolAddress: `0x${string}` | undefined;
  let backendOk = false;
  let rpcOk = false;

  const client = createPublicClient({ chain: hardhat, transport: http(RPC) });

  beforeAll(async () => {
    // Record chain head and load pool address
    try {
      const bn = await client.getBlockNumber();
      startBlock = bn;
      rpcOk = true;
    } catch {}
    try {
      const res = await fetch(`${BACKEND}/api/announcements/aa/00`);
      backendOk = res.ok || res.status === 404;
    } catch {}
    try {
      const deployments = await readJson<{ shieldedPool?: string }>('contracts/deployments/local.json');
      poolAddress = deployments.shieldedPool as `0x${string}` | undefined;
    } catch {}
  });

  it('resolves → derives → deposit → sweep via backend API', async () => {
    if (!backendOk) return; // skip when backend not reachable
    // 1) Resolve ENS to meta-address
    const ensName = 'alice.eth';
    const r1 = await fetch(`${BACKEND}/api/resolve-stealth/${encodeURIComponent(ensName)}`);
    expect(r1.ok).toBe(true);
    const { metaAddress } = (await r1.json()) as { metaAddress: { pSpend: string; pView: string } };
    expect(metaAddress.pSpend).toBeDefined();
    expect(metaAddress.pView).toBeDefined();

    // 2) Derive announcement
    const r2 = await fetch(`${BACKEND}/api/derive-stealth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ensName, metaAddress }),
    });
    expect(r2.ok).toBe(true);
    const ann = (await r2.json()) as any;
    expect(ann.id).toBeDefined();
    expect(ann.stealthAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);

    // 3) Sender deposits to shielded pool (backend demo pool)
    const value = 5;
    const r3 = await fetch(`${BACKEND}/api/pool/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcementId: ann.id, value }),
    });
    expect(r3.ok).toBe(true);
    const dep = await r3.json();
    expect(dep.note.value).toBe(value);
    expect(dep.note.spent).toBe(false);

    // 4) Recipient sweeps to main address
    const main = '0xabc0000000000000000000000000000000000000';
    const r4 = await fetch(`${BACKEND}/api/pool/sweep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pView: metaAddress.pView, mainAddress: main }),
    });
    expect(r4.ok).toBe(true);
    const sweep = await r4.json();
    expect(sweep.swept).toBeGreaterThanOrEqual(value);
    expect(Array.isArray(sweep.transfers)).toBe(true);
  });

  it('shielding privacy: onchain events exist but do not reveal stealth address', async () => {
    if (!rpcOk) return; // skip when RPC not reachable
    if (!poolAddress) {
      // If local pool not deployed or address unknown, skip with a helpful assertion
      expect(poolAddress, 'contracts/deployments/local.json missing shieldedPool').toBeDefined();
      return;
    }

    // Query Deposit/Withdrawal logs between startBlock+1 and latest
    const abi = (await readJson<any>('contracts/out/ShieldedPool.sol/ShieldedPool.json')).abi;
    const depositTopic = getAbiItem(abi, 'event', 'Deposit')?.topicHash
      || parseAbiItem('event Deposit(uint256 index, bytes32 commitment, uint256 amount, address sender)').topicHash;
    const withdrawalTopic = getAbiItem(abi, 'event', 'Withdrawal')?.topicHash
      || parseAbiItem('event Withdrawal(bytes32 nullifier, address recipient, address relayer, uint256 amount, uint256 fee)').topicHash;

    const end = await client.getBlockNumber();
    const [depLogs, wdLogs] = await Promise.all([
      client.getLogs({ address: poolAddress, fromBlock: startBlock + 1n, toBlock: end, topics: [depositTopic as any] }),
      client.getLogs({ address: poolAddress, fromBlock: startBlock + 1n, toBlock: end, topics: [withdrawalTopic as any] }),
    ]);
    expect(depLogs.length).toBeGreaterThan(0);
    expect(wdLogs.length).toBeGreaterThan(0);

    const serialized = JSON.stringify({ depLogs, wdLogs }).toLowerCase();
    // Stealth addresses should not appear in event data
    expect(serialized).not.toMatch(/0x[0-9a-f]{40}/);
  });
});
