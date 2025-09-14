#!/usr/bin/env node
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function copySafe(src, dest, label) {
  try {
    ensureDir(dest);
    copyFileSync(src, dest);
    console.log(`synced ${label}:`, dest);
  } catch (err) {
    console.warn(`warning: could not sync ${label} from ${src} -> ${dest}:`, err.message);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');
const repoRoot = resolve(root, '..');

// Paths
const contractsRoot = resolve(repoRoot, 'contracts');
const shieldedAbiSrc = resolve(contractsRoot, 'out/ShieldedPool.sol/ShieldedPool.json');
const deploymentsLocalSrc = resolve(contractsRoot, 'deployments/local.json');

const abiDest = resolve(root, 'src/abi/ShieldedPool.json');
const deploymentsLocalDest = resolve(root, 'src/deployments/local.json');

copySafe(shieldedAbiSrc, abiDest, 'ShieldedPool ABI');
copySafe(deploymentsLocalSrc, deploymentsLocalDest, 'local deployments');
