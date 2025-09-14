import express from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';

/**
 * A simple in‑memory store for announcements.  In a real application you would
 * persist these to a database or emit them as events on chain via an Announcer
 * contract as defined in ERC‑5564.  Each announcement contains the information
 * needed by a recipient to discover a stealth payment: the derived stealth
 * address, the sender’s ephemerally generated public key R, and a view tag.
 */
interface Announcement {
  id: number;
  ensName: string;
  metaAddress: { pSpend: string; pView: string };
  aStealth: string; // poseidon2-sim(pSpend, pView, R)
  stealthAddress: string;
  R: string;
  viewTag: string;
}

const announcements: Announcement[] = [];
let idCounter = 1;

function randomHex(bytes: number): string {
  return crypto.randomBytes(bytes).toString('hex');
}

function sha256Hex(hexConcat: string): string {
  const buf = Buffer.from(hexConcat, 'hex');
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// Poseidon2 simulation for alignment with Noir circuits. This is NOT Poseidon2;
// it uses SHA-256 over concatenated hex inputs to keep deterministic behavior
// consistent across the app. Replace with a real Poseidon2 when wiring ZK.
function poseidon2SimHex(inputsHex: string[]): string {
  const concat = inputsHex.join('');
  return sha256Hex(concat);
}

// Simplified in-memory shielded pool demo. This mimics a UTXO pool with
// commitments and nullifiers, without any on-chain or Merkle proofs.
interface PoolNote {
  id: number;
  commitment: string; // hex
  stealthAddress: string; // 0x...
  value: number;
  nullifier: string; // hex
  spent: boolean;
}

const poolNotes: PoolNote[] = [];
let poolIdCounter = 1;

const app = express();
app.use(bodyParser.json());

/**
 * Resolve an ENS name to a stealth meta‑address.  In a real implementation
 * this would query the ENS resolver for a registered meta‑address or consult
 * an ERC‑6538 registry.  Here we return a randomly generated pair of public
 * keys for demonstration purposes.
 */
function resolveStealthHandler(req: express.Request, res: express.Response) {
  const { ensName } = req.params;
  const pSpend = randomHex(32);
  const pView = randomHex(32);
  return res.json({ ensName, metaAddress: { pSpend, pView } });
}
app.get('/api/resolve-stealth/:ensName', resolveStealthHandler);

/**
 * Derive a fresh stealth address from a meta‑address.  This endpoint takes
 * the ENS name and the previously returned meta‑address and simulates the
 * derivation described in ERC‑5564.  It generates a random ephemerally
 * private key (here just random bytes), computes a simple SHA‑256 hash over
 * the spend key, view key and R, and uses this to derive a 20‑byte Ethereum
 * address.  The resulting announcement is stored in memory so it can be
 * discovered later by the recipient.
 */
function deriveStealthHandler(req: express.Request, res: express.Response) {
  const { ensName, metaAddress } = req.body;
  if (!metaAddress || !metaAddress.pSpend || !metaAddress.pView) {
    return res.status(400).json({ error: 'metaAddress with pSpend and pView is required' });
  }
  const R = randomHex(32);
  const aStealth = poseidon2SimHex([metaAddress.pSpend, metaAddress.pView, R]);
  const stealthAddress = '0x' + aStealth.slice(0, 40); // take first 20 bytes as address
  // Derive a 1-byte view tag from (pView, R)
  const viewTag = poseidon2SimHex([metaAddress.pView, R]).slice(0, 2);
  const announcement: Announcement = {
    id: idCounter++,
    ensName,
    metaAddress,
    aStealth,
    stealthAddress,
    R,
    viewTag
  };
  announcements.push(announcement);
  return res.json(announcement);
}
app.post('/api/derive-stealth', deriveStealthHandler);

/**
 * Fetch announcements by view tag.  The recipient can use the view tag to
 * quickly prefilter announcements that might belong to them.  In a real
 * application the recipient would verify the announcement by re‑deriving
 * the stealth address with their viewing key.  Here we simply filter on
 * the provided tag and return the matching announcements.
 */
function getAnnouncementsHandler(req: express.Request, res: express.Response) {
  const { viewTag, pView } = req.params as { viewTag: string; pView: string };
  // Filter by matching recomputed tag from (pView, R)
  const results = announcements.filter((a) => poseidon2SimHex([pView, a.R]).slice(0, 2) === viewTag);
  return res.json(results);
}
app.get('/api/announcements/:viewTag/:pView', getAnnouncementsHandler);

/**
 * Return a dummy zero‑knowledge proof attesting that the stealth address was
 * derived correctly from the provided parameters.  In a full implementation
 * this would run a SNARK proof over a circuit similar to the one in
 * circuits/derivation.circom.  The dummy proof shows the shape of the
 * returned object but contains no cryptographic value.
 */
function generateDerivationProofHandler(_req: express.Request, res: express.Response) {
  const proof = {
    a: randomHex(32),
    b: randomHex(32),
    c: randomHex(32)
  };
  return res.json({ proof });
}
app.post('/api/generate-derivation-proof', generateDerivationProofHandler);

/**
 * Return a dummy zero‑knowledge proof attesting that the recipient controls
 * the spend and view keys used to derive the stealth address.  A real
 * implementation would provide a SNARK proof evaluating a circuit similar
 * to circuits/ownership.circom.  Here we just return random values.
 */
function generateOwnershipProofHandler(_req: express.Request, res: express.Response) {
  const proof = {
    a: randomHex(32),
    b: randomHex(32),
    c: randomHex(32)
  };
  return res.json({ proof });
}
app.post('/api/generate-ownership-proof', generateOwnershipProofHandler);

/**
 * Shielded pool: deposit a note for a stealth address. In a real system,
 * the sender would include encrypted metadata so the recipient can sweep.
 * Here we derive a note secret from (pView, R) to keep flows consistent,
 * compute a commitment and precompute a nullifier for spending later.
 */
function poolDepositHandler(req: express.Request, res: express.Response) {
  const { announcementId, value } = req.body as { announcementId?: number; value?: number };
  if (!announcementId || typeof value !== 'number' || value <= 0) {
    return res.status(400).json({ error: 'announcementId and positive value are required' });
  }
  const ann = announcements.find((a) => a.id === Number(announcementId));
  if (!ann) return res.status(404).json({ error: 'announcement not found' });
  // Demo secret derived from (pView, R)
  const secret = poseidon2SimHex([ann.metaAddress.pView, ann.R]);
  // Fixed-width 32-byte hex encoding for value
  const valueHex = value.toString(16).padStart(64, '0');
  const commitment = poseidon2SimHex([ann.stealthAddress.replace(/^0x/, ''), valueHex, secret]);
  const nullifier = poseidon2SimHex([secret, ann.stealthAddress.replace(/^0x/, '')]);
  const note: PoolNote = {
    id: poolIdCounter++,
    commitment,
    stealthAddress: ann.stealthAddress,
    value,
    nullifier,
    spent: false
  };
  poolNotes.push(note);
  return res.json({
    note: {
      id: note.id,
      commitment: note.commitment,
      stealthAddress: note.stealthAddress,
      value: note.value,
      spent: note.spent
    }
  });
}
app.post('/api/pool/deposit', poolDepositHandler);

/**
 * Get current pool state for the demo UI.
 */
function poolStateHandler(_req: express.Request, res: express.Response) {
  const total = poolNotes.filter((n) => !n.spent).reduce((acc, n) => acc + n.value, 0);
  const commitments = poolNotes.map((n) => ({ id: n.id, commitment: n.commitment, stealthAddress: n.stealthAddress, value: n.value, spent: n.spent }));
  const nullifiers = poolNotes.filter((n) => n.spent).map((n) => n.nullifier);
  return res.json({ total, commitments, nullifiers });
}
app.get('/api/pool/state', poolStateHandler);

/**
 * Sweep: recipient provides pView and a mainAddress; we find unspent notes
 * for stealth addresses discoverable from announcements (matching addresses),
 * mark them spent, and return an aggregate transfer to mainAddress.
 */
function poolSweepHandler(req: express.Request, res: express.Response) {
  const { pView, mainAddress } = req.body as { pView?: string; mainAddress?: string };
  if (!pView || !mainAddress) return res.status(400).json({ error: 'pView and mainAddress are required' });

  // In a real wallet, discovery uses pView and R to recognize notes; here we
  // tie notes to announcements by matching stealth addresses.
  const ownedStealthAddresses = new Set(
    announcements.filter((a) => a.metaAddress.pView === pView).map((a) => a.stealthAddress)
  );

  const toSpend = poolNotes.filter((n) => !n.spent && ownedStealthAddresses.has(n.stealthAddress));
  if (toSpend.length === 0) return res.json({ swept: 0, transfers: [], spentNoteIds: [], message: 'No notes found for provided pView' });

  const spentNoteIds: number[] = [];
  let swept = 0;
  toSpend.forEach((n) => {
    n.spent = true;
    swept += n.value;
    spentNoteIds.push(n.id);
  });

  const transfers = swept > 0 ? [{ to: mainAddress, value: swept }] : [];
  return res.json({ swept, transfers, spentNoteIds });
}
app.post('/api/pool/sweep', poolSweepHandler);

const port = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on port ${port}`);
  });
}

export {
  app,
  resolveStealthHandler,
  deriveStealthHandler,
  getAnnouncementsHandler,
  generateDerivationProofHandler,
  generateOwnershipProofHandler,
  poolDepositHandler,
  poolStateHandler,
  poolSweepHandler,
  announcements,
  poolNotes
};
