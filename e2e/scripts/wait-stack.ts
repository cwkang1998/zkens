#!/usr/bin/env -S tsx
import fs from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

async function waitForHttp(url: string, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok || res.status === 404) return;
    } catch {}
    await delay(500);
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function waitForFile(path: string, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await fs.access(path);
      return;
    } catch {}
    await delay(500);
  }
  throw new Error(`Timeout waiting for file ${path}`);
}

async function main() {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001/api/announcements/aa/00';
  const deploymentsPath = process.env.DEPLOYMENTS_PATH || 'contracts/deployments/local.json';
  await waitForHttp(backendUrl);
  await waitForFile(deploymentsPath);
}

main().catch((err) => {
  console.error('[wait-stack] Error:', err.message);
  process.exit(1);
});
