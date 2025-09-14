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
      <h2>Shielded Pool</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <form onSubmit={handleDeposit} style={{ border: '1px solid #eee', borderRadius: 8, padding: '1rem' }}>
          <h3>Deposit (Sender)</h3>
          <p style={{ marginTop: 0 }}>Deposit funds to a recipient's stealth address using an announcementId.</p>
          <label>Announcement ID</label>
          <input value={announcementId} onChange={(e) => setAnnouncementId(e.target.value)} placeholder="e.g. 1" />
          <label>Value</label>
          <input value={depositValue} onChange={(e) => setDepositValue(e.target.value)} />
          <button type="submit" className="primary" disabled={depositLoading} style={{ marginTop: 8, padding: '0.5rem 1rem' }}>
            {depositLoading ? 'Depositing…' : 'Deposit to Pool'}
          </button>
        </form>

        <form onSubmit={handleSweep} style={{ border: '1px solid #eee', borderRadius: 8, padding: '1rem' }}>
          <h3>Sweep (Recipient)</h3>
          <p style={{ marginTop: 0 }}>Discover notes for your stealth addresses and consolidate to your main address.</p>
          <label>Viewing Key pView (hex)</label>
          <input value={pView} onChange={(e) => setPView(e.target.value)} placeholder="paste from resolve response" />
          <label>Main Address</label>
          <input value={mainAddress} onChange={(e) => setMainAddress(e.target.value)} />
          <button type="submit" className="primary" disabled={sweeping} style={{ marginTop: 8, padding: '0.5rem 1rem' }}>
            {sweeping ? 'Sweeping…' : 'Sweep to Main'}
          </button>
        </form>
      </div>

      <div style={{ marginTop: '1rem', border: '1px solid #eee', borderRadius: 8, padding: '1rem' }}>
        <h3>Pool State</h3>
        <button onClick={() => void refresh()} disabled={loading} style={{ marginBottom: 8 }}>Refresh</button>
        <div>Total (unspent): {state?.total ?? 0}</div>
        <div style={{ marginTop: 8 }}>
          {state?.commitments.map((c) => (
            <div key={c.id} style={{ marginBottom: 8, background: '#f9f9f9', padding: 8, borderRadius: 6 }}>
              <div><strong>Note #{c.id}</strong> — {c.spent ? 'spent' : 'unspent'} — value: {c.value}</div>
              <div>Stealth: {c.stealthAddress}</div>
              <div>Commitment: {c.commitment.slice(0, 18)}…</div>
            </div>
          ))}
        </div>
      </div>

      {sweepResult && (
        <div style={{ marginTop: '1rem', border: '1px solid #eee', borderRadius: 8, padding: '1rem' }}>
          <h3>Sweep Result</h3>
          <pre style={{ background: '#f0f0f0', padding: '0.5rem', borderRadius: 4 }}>{JSON.stringify(sweepResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

