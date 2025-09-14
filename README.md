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

Backend (Jest)
```bash
pnpm -F zk-ens-backend test
```
- Tests cover meta‑address resolve, stealth derivation (aligned `aStealth` + `viewTag`), announcement filtering by `(pView, R)`, and shielded pool deposit/sweep flows.

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

Alternative split mode
- You can run Anvil and deployment as separate services using Compose profiles:

```
docker compose --profile split up --build -d anvil contracts-deploy
```

- This will expose Anvil at `http://localhost:8545` and run a one‑shot deployment in `contracts-deploy`. Then start the rest:

```
docker compose --profile split up --build -d backend frontend
```
