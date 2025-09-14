import '@testing-library/jest-dom';

// Provide a stable base URL for relative links in tests
try {
  // @ts-ignore
  if (typeof window !== 'undefined' && window.location) {
    // @ts-ignore
    window.history.pushState({}, '', 'http://localhost/');
  }
} catch {}

// Override alert to avoid jsdom "not implemented" errors
try {
  Object.defineProperty(globalThis, 'alert', {
    value: () => {},
    writable: true
  });
} catch {}

// Minimal fetch mock for UI tests to avoid real network
if (typeof globalThis.fetch === 'function') {
  const realFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input?.url ?? '';
    if (url.startsWith('/api/pool/state')) {
      const body = JSON.stringify({ total: 0, commitments: [], nullifiers: [] });
      return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    // Default: fall back to real fetch if absolute; otherwise return OK empty
    try {
      if (typeof url === 'string' && /^https?:\/\//.test(url)) {
        return await realFetch(input as any, init);
      }
    } catch {}
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }) as any;
}
