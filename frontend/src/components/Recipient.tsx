import React, { useEffect, useState } from 'react';
import { Events } from './Events';

type Announcement = {
  id: number;
  metaAddress: { pSpend: string; pView: string };
  stealthAddress: string;
  R: string;
  viewTag: string;
};

export function Recipient() {
  const [viewTag, setViewTag] = useState('');
  const [pView, setPView] = useState('');
  const [results, setResults] = useState<Announcement[]>([]);
  const [proofs, setProofs] = useState<Record<number, { loading?: boolean; proof?: any; error?: boolean }>>({});
  const [loadingScan, setLoadingScan] = useState(false);
  const [fundsMap, setFundsMap] = useState<Record<string, number>>({});
  const [mainAddress, setMainAddress] = useState('0xabc0000000000000000000000000000000000000');
  const [sweeping, setSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState<any>(null);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!viewTag) return;
    setLoadingScan(true);
    setResults([]);
    setProofs({});
    try {
      const res = await fetch(`/api/announcements/${encodeURIComponent(viewTag)}/${encodeURIComponent(pView)}`);
      const data = await res.json();
      setResults(data as Announcement[]);
      // After we have announcements, fetch pool state once and compute funds per stealth address
      try {
        const poolRes = await fetch('/api/pool/state');
        const poolData = await poolRes.json();
        const map: Record<string, number> = {};
        (data as Announcement[]).forEach((a) => {
          const sum = (poolData.commitments as any[])
            .filter((n) => !n.spent && n.stealthAddress === a.stealthAddress)
            .reduce((acc, n) => acc + Number(n.value || 0), 0);
          map[a.stealthAddress] = sum;
        });
        setFundsMap(map);
      } catch (e) {
        // ignore funds map errors in demo
      }
    } catch (err) {
      console.error(err);
      alert('Error scanning announcements');
    } finally {
      setLoadingScan(false);
    }
  }

  async function handleOwnershipProof(a: Announcement) {
    const key = a.id;
    setProofs((prev) => ({ ...prev, [key]: { loading: true } }));
    try {
      const res = await fetch('/api/generate-ownership-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pSpend: a.metaAddress.pSpend,
          pView: a.metaAddress.pView,
          R: a.R,
          stealthAddress: a.stealthAddress
        })
      });
      const data = await res.json();
      setProofs((prev) => ({ ...prev, [key]: { loading: false, proof: (data as any).proof } }));
    } catch (err) {
      console.error(err);
      alert('Error generating ownership proof');
      setProofs((prev) => ({ ...prev, [key]: { loading: false, error: true } }));
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
      // refresh funds map after sweep
      await handleScan(new Event('submit') as any);
    } catch (e) {
      console.error(e);
      alert('Sweep failed');
    } finally {
      setSweeping(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold">Step 2 — Discover and sweep</h2>
      <p className="text-slate-600 text-sm mt-1 mb-4">Scan announcements with your view tag and pView, see received funds, and sweep to your main account.</p>

      <form onSubmit={handleScan} className="grid gap-2 max-w-2xl">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-1">
            <label className="text-sm font-medium">View Tag (hex)</label>
            <input
              type="text"
              value={viewTag}
              onChange={(e) => setViewTag(e.target.value)}
              placeholder="e.g. ff"
              className="px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="grid gap-1">
            <label className="text-sm font-medium">Viewing Key pView (hex)</label>
            <input
              type="text"
              value={pView}
              onChange={(e) => setPView(e.target.value)}
              placeholder="paste from resolve response"
              className="px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
        <button type="submit" disabled={loadingScan} className="mt-1 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-60 w-fit">
          {loadingScan ? 'Scanning…' : 'Scan Announcements'}
        </button>
      </form>

      {results.length > 0 && (
        <div className="mt-6">
          <h3 className="font-medium mb-3">Announcements</h3>
          <div className="grid gap-3">
            {results.map((a) => (
              <div key={a.id} className="p-4 border rounded-lg bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-700">
                    <div><span className="font-medium">Stealth</span>: {a.stealthAddress}</div>
                    <div className="text-xs text-slate-500">R: {a.R} · viewTag: {a.viewTag} · id: {a.id}</div>
                  </div>
                  <div className="text-sm font-medium">
                    Funds: {fundsMap[a.stealthAddress] ?? 0}
                  </div>
                </div>
                <div className="mt-3">
                  {proofs[a.id]?.proof ? (
                    <div>
                      <h4 className="font-medium text-sm">Ownership Proof (demo)</h4>
                      <pre className="bg-white border rounded p-3 text-xs overflow-auto">{JSON.stringify(proofs[a.id]?.proof, null, 2)}</pre>
                    </div>
                  ) : (
                    <button
                      onClick={() => void handleOwnershipProof(a)}
                      disabled={!!proofs[a.id]?.loading}
                      className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-60"
                    >
                      {proofs[a.id]?.loading ? 'Proving…' : 'Generate Ownership Proof'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 border rounded-lg bg-slate-50 max-w-2xl">
        <h3 className="font-medium">Sweep to Main Account</h3>
        <p className="text-xs text-slate-600">Collect all notes discoverable by your pView and transfer to your main account.</p>
        <form onSubmit={handleSweep} className="mt-2 grid gap-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={pView}
              onChange={(e) => setPView(e.target.value)}
              placeholder="pView"
              className="px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <input
              value={mainAddress}
              onChange={(e) => setMainAddress(e.target.value)}
              placeholder="0x… main address"
              className="px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <button type="submit" disabled={sweeping} className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-60 w-fit">
            {sweeping ? 'Sweeping…' : 'Sweep to Main'}
          </button>
        </form>
        {sweepResult && (
          <div className="mt-3">
            <h4 className="font-medium text-sm">Sweep Result</h4>
            <pre className="bg-white border rounded p-3 text-xs overflow-auto">{JSON.stringify(sweepResult, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Live onchain events: deposits signal announcements materialized onchain; withdrawals show sweeps */}
      <Events />
    </div>
  );
}
