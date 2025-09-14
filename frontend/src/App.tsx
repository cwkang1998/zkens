import React, { useState } from 'react';
import { Sender } from './components/Sender';
import { Recipient } from './components/Recipient';
import { Pool } from './components/Pool';

export function App() {
  const [tab, setTab] = useState<'sender' | 'recipient' | 'pool'>('sender');
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 800, margin: '2rem auto' }}>
      <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h1 style={{ marginTop: 0 }}>zk‑ENS Demo</h1>
        <nav style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <button
            className={tab === 'sender' ? 'active' : ''}
            onClick={() => setTab('sender')}
            style={{ padding: '0.5rem 1rem', borderRadius: 4, border: 'none', background: tab === 'sender' ? '#0070f3' : '#eaeaea', color: tab === 'sender' ? '#fff' : '#000' }}
          >
            Sender
          </button>
          <button
            className={tab === 'recipient' ? 'active' : ''}
            onClick={() => setTab('recipient')}
            style={{ padding: '0.5rem 1rem', borderRadius: 4, border: 'none', background: tab === 'recipient' ? '#0070f3' : '#eaeaea', color: tab === 'recipient' ? '#fff' : '#000' }}
          >
            Recipient
          </button>
          <button
            className={tab === 'pool' ? 'active' : ''}
            onClick={() => setTab('pool')}
            style={{ padding: '0.5rem 1rem', borderRadius: 4, border: 'none', background: tab === 'pool' ? '#0070f3' : '#eaeaea', color: tab === 'pool' ? '#fff' : '#000' }}
          >
            Shielded Pool
          </button>
        </nav>
        {tab === 'sender' ? <Sender /> : tab === 'recipient' ? <Recipient /> : <Pool />}
      </div>
    </div>
  );
}
