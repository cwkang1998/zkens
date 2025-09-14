import React, { useEffect, useState } from 'react';

type PoolState = {
  total: number;
  commitments: { id: number; commitment: string; stealthAddress: string; value: number; spent: boolean }[];
  nullifiers: string[];
};

export function Pool() {
  const [state, setState] = useState<PoolState | null>(null);
  const [loading, setLoading] = useState(false);
  const [announcementId, setAnnouncementId] = useState<string>('');
  const [depositValue, setDepositValue] = useState<string>('1');
  const [depositLoading, setDepositLoading] = useState(false);
  const [pView, setPView] = useState('');
  const [mainAddress, setMainAddress] = useState('0xabc0000000000000000000000000000000000000');
  const [sweeping, setSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState<any>(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch('/api/pool/state');
      const data = await res.json();
      setState(data as PoolState);
    } catch (e) {
      console.error(e);
      alert('Failed to fetch pool state');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!announcementId) return alert('Enter announcementId');
    const valueNum = Number(depositValue);
    if (!Number.isFinite(valueNum) || valueNum <= 0) return alert('Enter a positive value');
    setDepositLoading(true);
    try {
      const res = await fetch('/api/pool/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcementId: Number(announcementId), value: valueNum })
      });
      const data = await res.json();
      if ((data as any).error) throw new Error((data as any).error);
      await refresh();
    } catch (e) {
      console.error(e);
      alert('Deposit failed');
    } finally {
      setDepositLoading(false);
    }
  }

  async function handleSweep(e: React.FormEvent) {
    e.preventDefault();
    if (!pView || !mainAddress) return alert('Provide pView and main address');
    setSweeping(true);
    setSweepResult(null);
    try {
      const res = await fetch('/api/pool/sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pView, mainAddress })
      });
      const data = await res.json();
      setSweepResult(data);
      await refresh();
    } catch (e) {
      console.error(e);
      alert('Sweep failed');
    } finally {
      setSweeping(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold">Shielded Pool</h2>
      <p className="text-slate-600 text-sm mt-1 mb-4">Notes are created for stealth addresses and later swept to a main account.</p>

      <div className="grid md:grid-cols-2 gap-4">
        <form onSubmit={handleDeposit} className="border rounded-lg p-4 bg-slate-50">
          <h3 className="font-medium">Deposit (Sender)</h3>
          <p className="text-xs text-slate-600">Deposit funds to a recipient's stealth address using an announcementId.</p>
          <div className="mt-2 grid gap-2">
            <input
              value={announcementId}
              onChange={(e) => setAnnouncementId(e.target.value)}
              placeholder="Announcement ID (e.g. 1)"
              className="px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              value={depositValue}
              onChange={(e) => setDepositValue(e.target.value)}
              placeholder="Value"
              className="px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button type="submit" disabled={depositLoading} className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-60 w-fit">
              {depositLoading ? 'Depositing…' : 'Deposit to Pool'}
            </button>
          </div>
        </form>

        <form onSubmit={handleSweep} className="border rounded-lg p-4 bg-slate-50">
          <h3 className="font-medium">Sweep (Recipient)</h3>
          <p className="text-xs text-slate-600">Discover notes for your stealth addresses and consolidate to your main address.</p>
          <div className="mt-2 grid gap-2">
            <input
              value={pView}
              onChange={(e) => setPView(e.target.value)}
              placeholder="Viewing Key pView (hex)"
              className="px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              value={mainAddress}
              onChange={(e) => setMainAddress(e.target.value)}
              placeholder="0x… main address"
              className="px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button type="submit" disabled={sweeping} className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-60 w-fit">
              {sweeping ? 'Sweeping…' : 'Sweep to Main'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 border rounded-lg p-4 bg-slate-50">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Pool State</h3>
          <button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-slate-300 bg-white text-sm disabled:opacity-60">
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        <div className="mt-2 text-sm">Total (unspent): <span className="font-medium">{state?.total ?? 0}</span></div>
        <div className="mt-3 grid gap-2">
          {state?.commitments.map((c) => (
            <div key={c.id} className="rounded-lg border bg-white p-3">
              <div className="text-sm"><span className="font-semibold">Note #{c.id}</span> — {c.spent ? 'spent' : 'unspent'} — value: {c.value}</div>
              <div className="text-xs text-slate-600 break-all">Stealth: {c.stealthAddress}</div>
              <div className="text-xs text-slate-600 break-all">Commitment: {c.commitment.slice(0, 18)}…</div>
            </div>
          ))}
        </div>
      </div>

      {sweepResult && (
        <div className="mt-4 border rounded-lg p-4 bg-slate-50">
          <h3 className="font-medium">Sweep Result</h3>
          <pre className="bg-white border rounded p-3 text-xs overflow-auto">{JSON.stringify(sweepResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
