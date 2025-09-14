# Noir Circuits

Minimal Noir circuits for the demo, now with a shared library and complete derivation outputs. These are independent from the app and intentionally lightweight (no TS wrappers or extra tooling).

## Layout
- `common/` — shared library with derivation helpers
  - `derive_commitment(p_spend, p_view, r)` → Poseidon2 commitment
  - `derive_view_tag(p_view, r)` → 1‑byte view tag (`poseidon2(..) % 256`)
- `derivation/` — returns both `a_stealth` and `view_tag`
- `ownership/` — verifies both `a_stealth` and `view_tag`

## Prerequisites
- Install Nargo (Noir toolchain):
  - macOS/Linux:
    - `curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash`
    - `noirup -v v0.26.0`
  - Or follow the official docs: https://noir-lang.org/docs/getting_started
- Verify: `nargo --version`

## Commands
- Compile all: `pnpm -F circuits compile`
- Compile one: `pnpm -F circuits compile:derivation` or `compile:ownership`
- Prove: `pnpm -F circuits prove:derivation` or `prove:ownership`
- Verify: `pnpm -F circuits verify:derivation` or `verify:ownership`
- Clean: `pnpm -F circuits clean`

Artifacts are written to each program’s `target/` directory.

## Inputs & Examples
Create `Prover.toml` in the program directory.

derivation/Prover.toml
```toml
p_spend = "1"
p_view  = "2"
r       = "3"
```
Outputs (public): `(a_stealth, view_tag)` where:
- `a_stealth = poseidon2(p_spend, p_view, r)`
- `view_tag  = poseidon2(p_view, r) % 256`

ownership/Prover.toml
```toml
p_spend   = "1"
p_view    = "2"
r         = "3"
a_stealth = "<expected from derivation>"
view_tag  = "<expected from derivation>"
```

Notes
- This demo uses Poseidon2 for simplicity. A production‑ready design would follow ERC‑5564 (EC ops on secp256k1 + keccak) and should align with the backend derivation.
