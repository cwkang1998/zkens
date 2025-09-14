import React, { useState } from 'react';

export function Sender() {
  const [ensName, setEnsName] = useState('');
  const [meta, setMeta] = useState<{ pSpend: string; pView: string } | null>(null);
  const [announcement, setAnnouncement] = useState<any>(null);
  const [proof, setProof] = useState<any>(null);
  const [loadingResolve, setLoadingResolve] = useState(false);
  const [loadingDerive, setLoadingDerive] = useState(false);
  const [loadingProof, setLoadingProof] = useState(false);
  const [depositValue, setDepositValue] = useState('1');
  const [depositing, setDepositing] = useState(false);

  async function handleResolve() {
    if (!ensName) return;
    setLoadingResolve(true);
    setMeta(null);
    setAnnouncement(null);
    setProof(null);
    try {
      const res = await fetch(`/api/resolve-stealth/${encodeURIComponent(ensName)}`);
      const data = await res.json();
      setMeta(data.metaAddress);
    } catch (err) {
      console.error(err);
      alert('Error resolving ENS');
    } finally {
      setLoadingResolve(false);
    }
  }

  async function handleDerive() {
    if (!meta) return;
    setLoadingDerive(true);
    setAnnouncement(null);
    setProof(null);
    try {
      const res = await fetch('/api/derive-stealth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ensName, metaAddress: meta })
      });
      const data = await res.json();
      setAnnouncement(data);
    } catch (err) {
      console.error(err);
      alert('Error deriving stealth address');
    } finally {
      setLoadingDerive(false);
    }
  }

  async function handleProof() {
    if (!announcement) return;
    setLoadingProof(true);
    try {
      const res = await fetch('/api/generate-derivation-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ensName,
          metaAddress: meta,
          R: announcement.R,
          stealthAddress: announcement.stealthAddress
        })
      });
      const data = await res.json();
      setProof(data.proof);
    } catch (err) {
      console.error(err);
      alert('Error generating proof');
    } finally {
      setLoadingProof(false);
    }
  }

  async function handleDeposit() {
    if (!announcement?.id) return;
    const valueNum = Number(depositValue);
    if (!Number.isFinite(valueNum) || valueNum <= 0) {
      alert('Enter a positive value to deposit');
      return;
    }
    setDepositing(true);
    try {
      const res = await fetch('/api/pool/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcementId: announcement.id, value: valueNum })
      });
      const data = await res.json();
      if ((data as any).error) throw new Error((data as any).error);
      alert('Deposited to shielded pool');
    } catch (err) {
      console.error(err);
      alert('Error depositing to pool');
    } finally {
      setDepositing(false);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold">Step 1 — Send to ENS → stealth</h2>
      <p className="text-slate-600 text-sm mt-1 mb-4">Resolve an ENS name to a stealth meta‑address, derive a one‑time address, then deposit to the shielded pool.</p>

      <form onSubmit={(e) => { e.preventDefault(); void handleResolve(); }} className="grid gap-2 max-w-xl">
        <label htmlFor="ensName" className="text-sm font-medium">ENS Name</label>
        <input
          type="text"
          id="ensName"
          value={ensName}
          onChange={(e) => setEnsName(e.target.value)}
          placeholder="alice.eth"
          className="px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button type="submit" disabled={loadingResolve} className="mt-1 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-60">
          {loadingResolve ? 'Resolving…' : 'Resolve'}
        </button>
      </form>

      {meta && (
        <div className="mt-6 p-4 border rounded-lg bg-slate-50">
          <h3 className="font-medium mb-2">Resolved Meta‑Address</h3>
          <pre className="bg-white border rounded p-3 text-xs overflow-auto">{JSON.stringify(meta, null, 2)}</pre>
          <button onClick={() => void handleDerive()} disabled={loadingDerive} className="mt-3 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-60">
            {loadingDerive ? 'Deriving…' : 'Derive Stealth Address'}
          </button>
        </div>
      )}

      {announcement && (
        <div className="mt-6 p-4 border rounded-lg bg-slate-50">
          <h3 className="font-medium mb-2">Announcement</h3>
          <pre className="bg-white border rounded p-3 text-xs overflow-auto">{JSON.stringify(announcement, null, 2)}</pre>
          <button onClick={() => void handleProof()} disabled={loadingProof} className="mt-3 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-60">
            {loadingProof ? 'Proving…' : 'Generate Derivation Proof'}
          </button>
          <div className="mt-4">
            <h4 className="font-medium">Deposit to Shielded Pool</h4>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={depositValue}
                onChange={(e) => setDepositValue(e.target.value)}
                className="w-32 px-3 py-2 border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button onClick={() => void handleDeposit()} disabled={depositing} className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-60">
                {depositing ? 'Depositing…' : 'Deposit'}
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-1">This creates a shielded note for the derived stealth address.</p>
          </div>
        </div>
      )}

      {proof && (
        <div className="mt-6 p-4 border rounded-lg bg-slate-50">
          <h3 className="font-medium mb-2">Derivation Proof (demo)</h3>
          <pre className="bg-white border rounded p-3 text-xs overflow-auto">{JSON.stringify(proof, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
