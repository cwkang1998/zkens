import React, { useEffect, useMemo, useState } from 'react';
import ShieldedPoolJson from '../../../contracts/out/ShieldedPool.sol/ShieldedPool.json' assert { type: 'json' };
import localDeployments from '../../../contracts/deployments/local.json' assert { type: 'json' };
import { getPublicClient } from '../web3';
import { pickNetwork, poolAddress as poolAddressFromEnv } from '../config';

type LogItem = {
  type: 'Deposit' | 'Withdrawal';
  txHash: `0x${string}`;
  blockNumber: bigint;
  data: Record<string, any>;
};

export function Events() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const publicClient = useMemo(() => getPublicClient(), []);
  const net = pickNetwork();
  const poolAddress = (poolAddressFromEnv() || (net === 'local' ? (localDeployments as any).shieldedPool : undefined)) as
    | `0x${string}`
    | undefined;
  const abi = (ShieldedPoolJson as any).abi as any[];

  useEffect(() => {
    if (!poolAddress) return;
    const unwatchDeposit = publicClient.watchContractEvent({
      address: poolAddress,
      abi,
      eventName: 'Deposit',
      onLogs: (evts) => {
        setLogs((prev) => [
          ...evts.map((e) => ({
            type: 'Deposit' as const,
            txHash: e.transactionHash!,
            blockNumber: e.blockNumber!,
            data: (() => {
              const a = (e as any).args || {};
              return { index: a.index, commitment: a.commitment, amount: a.amount, sender: a.sender };
            })(),
          })),
          ...prev,
        ]);
      },
    });
    const unwatchWithdrawal = publicClient.watchContractEvent({
      address: poolAddress,
      abi,
      eventName: 'Withdrawal',
      onLogs: (evts) => {
        setLogs((prev) => [
          ...evts.map((e) => ({
            type: 'Withdrawal' as const,
            txHash: e.transactionHash!,
            blockNumber: e.blockNumber!,
            data: (() => {
              const a = (e as any).args || {};
              return { nullifier: a.nullifier, recipient: a.recipient, relayer: a.relayer, amount: a.amount, fee: a.fee };
            })(),
          })),
          ...prev,
        ]);
      },
    });
    return () => {
      unwatchDeposit?.();
      unwatchWithdrawal?.();
    };
  }, [poolAddress, publicClient]);

  if (!poolAddress) {
    return (
      <div className="mt-6 p-4 border rounded-lg bg-amber-50 text-amber-800 text-sm">
        Pool address not configured for {net}. Set `VITE_POOL_ADDRESS` for Sepolia or ensure `contracts/deployments/local.json` exists for local.
      </div>
    );
  }

  return (
    <div className="mt-6 p-4 border rounded-lg bg-slate-50">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Live Pool Events</h3>
        <div className="text-xs text-slate-500">address: {poolAddress}</div>
      </div>
      <div className="mt-3 grid gap-2">
        {logs.length === 0 && <div className="text-sm text-slate-600">No events observed yet.</div>}
        {logs.map((l, i) => (
          <div key={l.txHash + String(i)} className="rounded-lg border bg-white p-3 text-sm">
            <div className="font-medium">{l.type}</div>
            <div className="text-xs text-slate-600">tx: {l.txHash}</div>
            <pre className="bg-slate-50 border rounded p-2 text-xs overflow-auto mt-1">{JSON.stringify(l.data, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
