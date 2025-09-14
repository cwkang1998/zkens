import React, { useEffect, useState } from 'react';
import { connectWallet, getWalletClient, watchWallet } from '../web3';

export function Wallet() {
  const [account, setAccount] = useState<`0x${string}` | undefined>();
  const [chainId, setChainId] = useState<string | undefined>();
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const unwatch = watchWallet((accs, chain) => {
      setAccount(accs?.[0]);
      setChainId(chain);
    });
    return () => unwatch();
  }, []);

  async function onConnect() {
    try {
      setConnecting(true);
      const accs = await connectWallet();
      setAccount(accs?.[0]);
      const eth = (window as any).ethereum;
      setChainId(eth?.chainId);
      await getWalletClient();
    } catch (e: any) {
      alert(e?.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  }

  if (!account) {
    return (
      <button onClick={() => void onConnect()} disabled={connecting} className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-primary text-white text-sm disabled:opacity-60">
        {connecting ? 'Connecting…' : 'Connect Wallet'}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
        {account.slice(0, 6)}…{account.slice(-4)}
      </span>
      <span className="text-slate-500">chain {chainId}</span>
    </div>
  );
}

