import { describe, it, expect } from 'vitest';

const BACKEND = process.env.BACKEND_BASE || 'http://localhost:3001';

async function json(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${init?.method || 'GET'} ${url} -> ${res.status}`);
  return res.json();
}

describe('E2E: API front-to-back flow (no UI)', () => {
  it('resolve -> derive -> deposit -> state -> sweep', async () => {
    // 1. Resolve meta-address
    const ensName = 'alice.eth';
    const resolve = await json(`${BACKEND}/api/resolve-stealth/${encodeURIComponent(ensName)}`);
    expect(resolve?.metaAddress?.pSpend).toBeTruthy();
    expect(resolve?.metaAddress?.pView).toBeTruthy();

    // 2. Derive stealth address (announcement)
    const derive = await json(`${BACKEND}/api/derive-stealth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ensName, metaAddress: resolve.metaAddress })
    });
    expect(derive?.stealthAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(derive?.id).toBeTypeOf('number');
    expect(derive?.viewTag).toBeTypeOf('string');

    // 3. Discover announcements using (viewTag, pView)
    const anns = await json(`${BACKEND}/api/announcements/${derive.viewTag}/${resolve.metaAddress.pView}`);
    expect(Array.isArray(anns)).toBe(true);
    expect(anns.find((a: any) => a.id === derive.id)).toBeTruthy();

    // 4. Deposit into shielded pool (in-memory demo)
    const value = 1234;
    const depRes = await json(`${BACKEND}/api/pool/deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcementId: derive.id, value })
    });
    expect(depRes?.note?.commitment).toBeTypeOf('string');

    // 5. Pool state reflects commitment
    const state = await json(`${BACKEND}/api/pool/state`);
    expect(state?.commitments?.length).toBeGreaterThan(0);

    // 6. Sweep funds to a main address using pView
    const sweep = await json(`${BACKEND}/api/pool/sweep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pView: resolve.metaAddress.pView, mainAddress: '0xabc0000000000000000000000000000000000000' })
    });
    expect(sweep?.swept).toBeGreaterThan(0);
    expect(Array.isArray(sweep?.spentNoteIds)).toBe(true);
  });
});

