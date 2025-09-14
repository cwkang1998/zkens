import React, { useState } from 'react';

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

  return (
    <div>
      <h2>Recipient</h2>
      <form onSubmit={handleScan}>
        <label>View Tag (hex)</label>
        <input
          type="text"
          value={viewTag}
          onChange={(e) => setViewTag(e.target.value)}
          placeholder="e.g. ff"
          style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: 4 }}
        />
        <label>Viewing Key pView (hex)</label>
        <input
          type="text"
          value={pView}
          onChange={(e) => setPView(e.target.value)}
          placeholder="optional for demo"
          style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: 4 }}
        />
        <button type="submit" className="primary" disabled={loadingScan} style={{ marginTop: 8, padding: '0.5rem 1rem' }}>
          {loadingScan ? 'Scanning…' : 'Scan Announcements'}
        </button>
      </form>

      {results.length > 0 && (
        <div>
          <h3>Announcements</h3>
          {results.map((a) => (
            <div key={a.id} style={{ marginBottom: '1rem', padding: '0.5rem', border: '1px solid #ddd', borderRadius: 4 }}>
              <pre style={{ background: '#f0f0f0', padding: '0.5rem', borderRadius: 4 }}>{JSON.stringify(a, null, 2)}</pre>
              {proofs[a.id]?.proof ? (
                <div>
                  <h4>Ownership Proof (dummy)</h4>
                  <pre style={{ background: '#f0f0f0', padding: '0.5rem', borderRadius: 4 }}>{JSON.stringify(proofs[a.id]?.proof, null, 2)}</pre>
                </div>
              ) : (
                <button
                  onClick={() => void handleOwnershipProof(a)}
                  className="primary"
                  disabled={!!proofs[a.id]?.loading}
                  style={{ padding: '0.5rem 1rem' }}
                >
                  {proofs[a.id]?.loading ? 'Proving…' : 'Generate Ownership Proof'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

