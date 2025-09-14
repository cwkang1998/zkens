# Contracts (Foundry)

This package contains the on-chain Shielded Pool skeleton implemented in Solidity and managed with Foundry.

## Layout
- `src/ShieldedPool.sol` — minimal ETH-based shielded pool skeleton (events, deposits, nullifier-tracked withdrawals).
- `src/IVerifier.sol` — interface for a pluggable proof verifier.
- `src/VerifierMock.sol` — mock verifier that always returns `true` (for local testing).
- `script/Deploy.s.sol` — Foundry script to deploy verifier + pool.
- `test/ShieldedPool.t.sol` — basic tests using `forge-std`.

## Prerequisites
- Install Foundry: https://book.getfoundry.sh/getting-started/installation
  - `foundryup` or curl installer from the docs.

## Install deps
```
cd contracts
forge install foundry-rs/forge-std
```

## Build
```
forge build
```

## Test
```
forge test -vvv
```

## Deploy (example)
Replace `RPC_URL` and `PRIVATE_KEY` with your values.
```
forge script script/Deploy.s.sol \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

## Notes
- The pool uses a generic `IVerifier` interface and does not include any specific circuit or hash functions. Integrate your circom/noir artifacts by deploying a real verifier that implements `IVerifier`.
- Deposits accept ETH and emit `Deposit` events. Withdrawals require an unused `nullifier`, a valid verifier proof, and transfer ETH to the recipient while paying an optional relayer fee.
- This is a safe starting point for wiring your circuits and frontend. Do not use in production without rigorous audits and real proof verification.
