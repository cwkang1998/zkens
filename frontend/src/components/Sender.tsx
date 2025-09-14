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
      <h2>Sender</h2>
      <form onSubmit={(e) => { e.preventDefault(); void handleResolve(); }}>
        <label htmlFor="ensName">ENS Name</label>
        <input
          type="text"
          id="ensName"
          value={ensName}
          onChange={(e) => setEnsName(e.target.value)}
          placeholder="alice.eth"
          style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: 4 }}
        />
        <button type="submit" className="primary" disabled={loadingResolve} style={{ marginTop: 8, padding: '0.5rem 1rem' }}>
          {loadingResolve ? 'Resolving…' : 'Resolve'}
        </button>
      </form>

      {meta && (
        <div>
          <h3>Resolved Meta‑Address</h3>
          <pre style={{ background: '#f0f0f0', padding: '0.5rem', borderRadius: 4 }}>{JSON.stringify(meta, null, 2)}</pre>
          <button onClick={() => void handleDerive()} className="primary" disabled={loadingDerive} style={{ padding: '0.5rem 1rem' }}>
            {loadingDerive ? 'Deriving…' : 'Derive Stealth Address'}
          </button>
        </div>
      )}

      {announcement && (
        <div>
          <h3>Announcement</h3>
          <pre style={{ background: '#f0f0f0', padding: '0.5rem', borderRadius: 4 }}>{JSON.stringify(announcement, null, 2)}</pre>
          <button onClick={() => void handleProof()} className="primary" disabled={loadingProof} style={{ padding: '0.5rem 1rem' }}>
            {loadingProof ? 'Proving…' : 'Generate Derivation Proof'}
          </button>
          <div style={{ marginTop: 12 }}>
            <h4>Deposit to Shielded Pool</h4>
            <label>Value</label>
            <input
              type="text"
              value={depositValue}
              onChange={(e) => setDepositValue(e.target.value)}
              style={{ marginRight: 8, padding: '0.25rem', border: '1px solid #ccc', borderRadius: 4 }}
            />
            <button onClick={() => void handleDeposit()} className="primary" disabled={depositing} style={{ padding: '0.5rem 1rem' }}>
              {depositing ? 'Depositing…' : 'Deposit'}
            </button>
          </div>
        </div>
      )}

      {proof && (
        <div>
          <h3>Derivation Proof (dummy)</h3>
          <pre style={{ background: '#f0f0f0', padding: '0.5rem', borderRadius: 4 }}>{JSON.stringify(proof, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
