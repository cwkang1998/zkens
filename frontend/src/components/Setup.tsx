import React, { useMemo, useState } from 'react';
import { encodeFunctionData, namehash } from 'viem';
import { getPublicClient, getWalletClient } from '../web3';
import { ENS_REGISTRY_ABI } from '../abis/ensRegistry';
import { PUBLIC_RESOLVER_ABI } from '../abis/publicResolver';
import { ensRegistryAddress, pickNetwork } from '../config';

// Simple ENS setup UI: store stealth metadata as ENS text records
// Keys: 'stealth:pSpend' and 'stealth:pView' (or a single JSON in 'stealth')

export function Setup() {
  const [ensName, setEnsName] = useState('');
  const [pSpend, setPSpend] = useState('');
  const [pView, setPView] = useState('');
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const publicClient = useMemo(() => getPublicClient(), []);

  async function getResolver(name: string): Promise<`0x${string}`> {
    const node = namehash(name) as `0x${string}`;
    const registry = ensRegistryAddress();
    if (!registry) {
      const net = pickNetwork();
      throw new Error(
        `ENS registry not configured for ${net}. Set VITE_ENS_REGISTRY to your chain's ENS registry address.`
      );
    }
    const resolver = (await publicClient.readContract({
      address: registry,
      abi: ENS_REGISTRY_ABI,
      functionName: 'resolver',
      args: [node],
    })) as `0x${string}`;
    if (!resolver || resolver === '0x0000000000000000000000000000000000000000') {
      throw new Error('ENS name has no resolver set');
    }
    return resolver;
  }

  async function writeText(resolver: `0x${string}`, node: `0x${string}`, key: string, value: string) {
    const wallet = await getWalletClient();
    if (!wallet) throw new Error('Wallet not connected');
    const data = encodeFunctionData({ abi: PUBLIC_RESOLVER_ABI, functionName: 'setText', args: [node, key, value] });
    const [account] = await wallet.getAddresses();
    const hash = await wallet.sendTransaction({ account, to: resolver, data, chain: undefined as any });
    setStatus(`Tx sent: ${hash}`);
    await publicClient.waitForTransactionReceipt({ hash });
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!ensName || !pSpend || !pView) return alert('Enter ENS name, pSpend, pView');
    setLoading(true);
    setStatus('');
    try {
      const node = namehash(ensName) as `0x${string}`;
      const resolver = await getResolver(ensName);
      // Store individually for compatibility
      await writeText(resolver, node, 'stealth:pSpend', pSpend);
      await writeText(resolver, node, 'stealth:pView', pView);
      // Also store combined JSON payload
      const payload = JSON.stringify({ pSpend, pView });
      await writeText(resolver, node, 'stealth', payload);
      setStatus('Registered stealth metadata on ENS');
    } catch (e: any) {
      console.error(e);
      setStatus(e?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleRead(e: React.FormEvent) {
    e.preventDefault();
    if (!ensName) return;
    setLoading(true);
    setStatus('');
    try {
      const node = namehash(ensName) as `0x${string}`;
      const resolver = await getResolver(ensName);
      const value = (await publicClient.readContract({
        address: resolver,
        abi: PUBLIC_RESOLVER_ABI,
        functionName: 'text',
        args: [node, 'stealth'],
      })) as string;
      setStatus(value ? `stealth: ${value}` : 'No stealth text record set');
    } catch (e: any) {
      console.error(e);
      setStatus(e?.message || 'Failed to read');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold">Setup ENS Metadata</h2>
      <p className="text-slate-600 text-sm mt-1 mb-4">Register your stealth public keys in your ENS resolver via text records.</p>

      <form onSubmit={handleRegister} className="grid gap-2 max-w-2xl">
        <label className="text-sm font-medium">ENS name</label>
        <input value={ensName} onChange={(e) => setEnsName(e.target.value)} placeholder="alice.eth" className="px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/40" />
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-1">
            <label className="text-sm font-medium">pSpend (hex)</label>
            <input value={pSpend} onChange={(e) => setPSpend(e.target.value)} placeholder="0x…" className="px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div className="grid gap-1">
            <label className="text-sm font-medium">pView (hex)</label>
            <input value={pView} onChange={(e) => setPView(e.target.value)} placeholder="0x…" className="px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="submit" disabled={loading} className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-60">
            {loading ? 'Registering…' : 'Register ENS Metadata'}
          </button>
          <button onClick={handleRead} disabled={loading || !ensName} className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-slate-300 bg-white disabled:opacity-60">
            Read Existing
          </button>
        </div>
      </form>

      {status && (
        <div className="mt-4 p-3 border rounded bg-slate-50 text-sm break-all">{status}</div>
      )}
    </div>
  );
}
