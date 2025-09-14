import React, { useState } from 'react';
import { Sender } from './components/Sender';
import { Recipient } from './components/Recipient';
import { Pool } from './components/Pool';
import { Wallet } from './components/Wallet';
import { Setup } from './components/Setup';

export function App() {
  const [tab, setTab] = useState<'setup' | 'sender' | 'recipient' | 'pool'>('setup');
  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-6 pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">zk‑ENS Demo</h1>
              <p className="text-slate-600 mt-1 text-sm">
                Privacy-preserving payments using ENS → stealth addresses → shielded pool → main account.
              </p>
            </div>
            <Wallet />
          </div>
        </div>

        <div className="mt-4 px-2 border-b border-slate-200">
          <nav className="flex gap-2">
            <button
              onClick={() => setTab('setup')}
              className={
                'px-4 py-2 text-sm rounded-t-md border-b-2 ' +
                (tab === 'setup' ? 'border-primary text-primary font-medium' : 'border-transparent text-slate-600 hover:text-slate-900')
              }
            >
              Setup
            </button>
            <button
              onClick={() => setTab('sender')}
              className={
                'px-4 py-2 text-sm rounded-t-md border-b-2 ' +
                (tab === 'sender' ? 'border-primary text-primary font-medium' : 'border-transparent text-slate-600 hover:text-slate-900')
              }
            >
              1) Sender
            </button>
            <button
              onClick={() => setTab('recipient')}
              className={
                'px-4 py-2 text-sm rounded-t-md border-b-2 ' +
                (tab === 'recipient' ? 'border-primary text-primary font-medium' : 'border-transparent text-slate-600 hover:text-slate-900')
              }
            >
              2) Recipient
            </button>
            <button
              onClick={() => setTab('pool')}
              className={
                'px-4 py-2 text-sm rounded-t-md border-b-2 ' +
                (tab === 'pool' ? 'border-primary text-primary font-medium' : 'border-transparent text-slate-600 hover:text-slate-900')
              }
            >
              Shielded Pool
            </button>
          </nav>
        </div>

        <div className="p-6">
          {tab === 'setup' ? <Setup /> : tab === 'sender' ? <Sender /> : tab === 'recipient' ? <Recipient /> : <Pool />}
        </div>
      </div>
    </div>
  );
}
