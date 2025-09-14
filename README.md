# zk-ENS Demo Pack

This repository contains a small proof‑of‑concept implementation of a **zk‑ENS** resolver.  The goal of the demo is to illustrate how one could decouple an ENS name from a user’s real wallet by resolving the name to a *stealth meta‑address* and deriving a fresh one‑time address for each payment.  It also shows where zero‑knowledge proofs (ZKPs) could be introduced to verify address derivations or payment ownership without revealing sensitive secrets.

## Project Structure

```
zk-ens-demo/
├── README.md              – this file
├── backend/               – simple Express server written in TypeScript
│   ├── package.json       – dependencies for the backend
│   ├── tsconfig.json      – TypeScript configuration
│   └── src/
│       └── index.ts       – implements the API endpoints
├── frontend/              – React application written in TypeScript
│   ├── package.json       – dependencies for the frontend
│   ├── tsconfig.json      – TypeScript configuration
│   └── src/
│       ├── App.tsx        – main application component
│       ├── index.tsx      – entry point for React
│       └── components/    – reusable UI components
│           ├── Sender.tsx     – form for resolving and deriving stealth addresses
│           └── Recipient.tsx  – form for scanning announcements and generating proofs
└── circuits/             – zero‑knowledge circuit skeletons (Circom)
    ├── derivation.circom – sketch of a circuit that verifies stealth address derivation
    └── ownership.circom  – sketch of a circuit that verifies note ownership
```

## Running the App

This is a **pnpm monorepo**: backend (Express), frontend (React + Vite), and Noir circuits.

Prereqs
- Node.js 18+ and pnpm installed
- Optional: Noir toolchain (`nargo`) for circuits

Install
```bash
pnpm install
```

Development
- Run everything:
  ```bash
  pnpm dev
  ```
- Or run individually:
  ```bash
  pnpm -F zk-ens-backend dev     # http://localhost:3001
  pnpm -F zk-ens-frontend dev    # http://localhost:3030 (proxy /api to backend)
  ```

API Endpoints
The backend exposes:

   * `GET /api/resolve-stealth/:ensName` – returns a randomly generated stealth meta‑address (spend and view pubkeys) for the provided ENS name.
   * `POST /api/derive-stealth` – given an `ensName` and `metaAddress` object, derives a fresh stealth address, announces it, and returns the result. Uses a Poseidon2‑simulated hash for `aStealth = H(pSpend, pView, R)` and `viewTag = H(pView, R) % 256` for end‑to‑end alignment with the demo circuits.
   * `GET /api/announcements/:viewTag/:pView` – fetches announcements where the recomputed `viewTag` from `(pView, R)` matches the provided tag.
   * `POST /api/generate-derivation-proof` – returns a dummy proof object to illustrate where a ZKP of correct derivation would be returned.
   * `POST /api/generate-ownership-proof` – returns a dummy proof object to illustrate where a ZKP of note ownership would be returned.
   * `POST /api/pool/deposit` – deposit to the shielded pool using an `announcementId` and `value`.
   * `GET  /api/pool/state` – view in‑memory pool state (commitments/nullifiers, totals).
   * `POST /api/pool/sweep` – sweep discoverable notes for a given `pView` to a `mainAddress`.

Production build

   ```bash
   pnpm build
   pnpm -F zk-ens-backend start
  pnpm -F zk-ens-frontend start
   ```

The frontend `start` serves a built preview; the backend runs compiled JS from `dist/`.

## Using the App

Sender
- Enter an ENS name and Resolve to obtain a meta‑address (pSpend, pView)
- Derive Stealth Address to announce a new stealth address with `R` and `viewTag`
- Optionally Deposit to Shielded Pool (value input) for that announcement

Recipient
- Use the Recipient tab to scan announcements by `viewTag` and your `pView`
- Or go to Shielded Pool tab and Sweep by entering `pView` and `mainAddress` to consolidate notes to your main account (off‑chain in this demo)

## Protocol Overview (zk‑ENS with Stealth + Pool)

Goal
- Decouple a public ENS identity from spend activity by deriving unlinkable, one‑time stealth addresses for each payment, then aggregating those funds in a privacy pool before sweeping to a main account.

High‑Level Flow
```
┌──────────┐        1) Resolve ENS        ┌──────────────────────┐
│  Sender  │ ───────────────────────────► │  Backend (Resolver)  │
└──────────┘                              └──────────────────────┘
      │                                            │
      │ 2) Derive (pSpend, pView, R) → stealth     │
      ├──────────────────────────────────────────► │
      │◄────────────────────── 3) Announcement (R, viewTag, stealth)
      │
      │ 4) Send funds → stealth
      │ 5) Deposit note → Shielded Pool (commitment)
      ▼                                            │
┌──────────────────────┐                           │
│   Shielded Pool      │ ◄─────────────────────────┘
│  (notes + nullifiers)│
└──────────────────────┘
      ▲
      │ 6) Recipient scans announcements via viewTag
┌────────────┐  7) Prove ownership (demo)  ┌──────────────────────┐
│ Recipient  │ ───────────────────────────► │  Backend (Proof API) │
└────────────┘                              └──────────────────────┘
      │
      │ 8) Sweep: discover owned notes by pView, mark spent,
      │    and transfer aggregate to main account (unlinkable)
      └────────────────────────────────────────────────────────► Main Account
```

Low‑Level Mechanics (demo)
- Meta‑address: backend simulates an ENS record with `{ pSpend, pView }` (random hex in this demo).
- Ephemeral key: sender samples `R` (random in demo) and derives:
  - `aStealth = H(pSpend, pView, R)`; `stealth = 0x[aStealth[0..20bytes]]`
  - `viewTag = H(pView, R)[0..1byte]` for quick recipient filtering
- Announcement: stored in memory with `{ensName, metaAddress, stealth, R, viewTag}`.
- Pool deposit: commitment = `H(stealth, value, secret)` where `secret = H(pView, R)`; a nullifier `H(secret, stealth)` is precomputed for spending later. Notes live in an in‑memory list.
- Discovery: recipient recomputes `H(pView, R)[0..1byte]` and filters announcements by `viewTag`; ownership proof is simulated.
- Sweep: for a given `pView`, the backend finds all unspent notes tied to stealth addresses announced with that `pView`, marks them spent, and returns a single transfer to the provided main address.

Privacy Properties (intended)
- One‑time stealth addresses unlink payments to the ENS identity.
- Aggregation through a pool breaks the link between individual stealth addresses and the final main account.
- View tags let recipients efficiently discover relevant announcements without revealing keys.

Out‑of‑Scope/In Demo Form
- Real key derivation, real Poseidon2, Merkle trees, and SNARK proofs are simulated to keep the demo small and readable.
- ENS integration is mocked; a production system would use ENS resolver records or an ERC‑6538 registry for meta‑addresses and emit announcements per ERC‑5564.

## Noir Circuits

The `circuits` package now uses Noir (Nargo) with two programs. They are not wired to the app by default and serve as a starting point.

Structure:

```
circuits/
  common/       # shared helpers (derive commitment + view tag)
  derivation/   # returns (a_stealth, view_tag)
  ownership/    # verifies both a_stealth and view_tag
```

- `derivation`: outputs `a_stealth = poseidon2(pSpend, pView, R)` and `view_tag = poseidon2(pView, R) % 256`.
- `ownership`: verifies both values.

Local compile requires `nargo` in PATH. See `circuits/README.md`.

## Tests

Workspace
```bash
pnpm test
```

Backend (Vitest)
```bash
pnpm -F zk-ens-backend test
```
- Covers: resolve, derive, announcements filter, pool deposit/state, sweep flows.

Frontend (Vitest)
```bash
pnpm -F zk-ens-frontend test
```
- Unit tests cover tab navigation and basic rendering of Sender and Pool forms. The test setup mocks `fetch` for pool state to avoid network.

Circuits (Nargo)
```bash
pnpm -F circuits test
```
- Runs Noir `#[test]` cases in both programs. Requires `nargo`.

## CI

GitHub Actions is configured in `.github/workflows/ci.yml`:
- Backend & Frontend job: installs deps, runs tests, then builds.
- Circuits job: installs the Noir toolchain via `noirup` and runs `pnpm -F circuits test`.
  This job is marked `continue-on-error: true` so the pipeline still passes if Noir setup fails.

## Notes and Caveats

* **Simplifications** – This demo uses a Poseidon2 simulation in the backend (SHA‑256 over concatenated inputs) to align with the Noir circuits’ formulas, random keys instead of valid secp256k1 points, and dummy proof objects.  The shielded pool is an in‑memory approximation (no Merkle tree or on‑chain data). Real implementations should use appropriate cryptographic primitives (e.g. `noble-secp256k1` for key derivation, `ethers.js`/Keccak) and real Poseidon2 + ZK circuits with a Merkle accumulator.
* **Encoding** – The pool commitment encodes `value` as fixed‑width 32‑byte hex.
* **No persistence** – All announcements are stored in an in‑memory array on the server.  Restarting the backend will lose all data.
* **ENS integration** – The server does not actually query the ENS registry.  It simply generates a random meta‑address for any name.  In a real system you would read the ENS resolver records or an ERC‑6538 registry to obtain the registered stealth meta‑address.

This demo is intended to highlight the flow and user experience of a zk‑ENS integration rather than to provide a secure, production‑ready product.

## Contracts (Shielded Pool)

A new Foundry package has been added under `contracts/` containing a minimal on‑chain Shielded Pool skeleton and deployment script.

Quick start:

```
cd contracts
forge install foundry-rs/forge-std
forge build
forge test -vvv
```

Deploy example:

```
forge script script/Deploy.s.sol \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

Notes:
- The pool accepts ETH deposits with `deposit(bytes32 commitment)` and withdrawals via `withdraw(...)` gated by a pluggable `IVerifier`.
- A `VerifierMock` is included for local testing; wire in your real verifier generated from the circuits when ready.

## Local Demo via Docker Compose

Spin up a complete local stack with an Anvil chain, auto‑deployment of the contracts, the backend API, and the frontend UI.

Commands:

```
docker compose up --build
```

Services:
- `chain` – unified service running Anvil and deploying `VerifierMock` + `ShieldedPool`; writes addresses to `contracts/deployments/local.json`.
- `backend` – API at `http://localhost:3001`.
- `frontend` – UI at `http://localhost:3030` (Vite dev with proxy to backend).

Deployment output:
- After startup, find deployed addresses in `contracts/deployments/local.json`.

 

## End-to-End (API only)

The `e2e/` package runs a front‑to‑back flow against the backend only (no browser): resolve → derive → announcements → deposit → pool state → sweep.

- One‑shot runner (brings up chain + backend, waits, runs test, tears down):
  - `pnpm -F zk-ens-e2e e2e`
- Manual control:
  - `pnpm -F zk-ens-e2e up`
  - `pnpm -F zk-ens-e2e wait`
  - `vitest run` inside `e2e/`
  - `pnpm -F zk-ens-e2e down`
