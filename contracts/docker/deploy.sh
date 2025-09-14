#!/usr/bin/env bash
set -euo pipefail

RPC_URL=${RPC_URL:-http://anvil:8545}
SENDER=${SENDER:-0xF39Fd6e51aad88F6F4ce6aB8827279cffFb92266}

echo "Waiting for Anvil at $RPC_URL ..."
for i in $(seq 1 60); do
  if cast chain-id --rpc-url "$RPC_URL" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "workdir: $(pwd) user: $(whoami)"

# Avoid git submodule issues in bind-mounted workspace by disabling git actions in Foundry
export FOUNDRY_DISABLE_GIT=1

# Ensure this directory is a git repo so `forge install` works (idempotent)
# Optional: initialize a lightweight git repo so tools that expect it don't fail
if [ ! -d .git ]; then
  git init -q || true
fi

# Install forge-std only if missing
if [ ! -d lib/forge-std ]; then
  echo "Installing forge-std dependency ..."
  forge install foundry-rs/forge-std@v1.10.0 || forge install foundry-rs/forge-std || true
fi

echo "Building contracts (skip tests) ..."
forge build --skip test

echo "Deploying via forge create ..."
# Re-check RPC availability before broadcasting
for i in $(seq 1 60); do
  if cast chain-id --rpc-url "$RPC_URL" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# 1) VerifierMock
echo "Creating VerifierMock ..."
VERIFIER_OUT=$(forge create src/VerifierMock.sol:VerifierMock \
  --rpc-url "$RPC_URL" \
  --unlocked \
  --from "$SENDER" 2>&1 || true)
echo "$VERIFIER_OUT"
VERIFIER_ADDR=$(echo "$VERIFIER_OUT" | sed -n 's/.*Deployed to: \(0x[0-9a-fA-F]\{40\}\).*/\1/p' | tail -n1)
if [ -z "$VERIFIER_ADDR" ]; then
  echo "Failed to deploy VerifierMock" >&2
  exit 1
fi

# 2) ShieldedPool(verifier)
echo "Creating ShieldedPool with verifier=$VERIFIER_ADDR ..."
POOL_OUT=$(forge create src/ShieldedPool.sol:ShieldedPool \
  --constructor-args "$VERIFIER_ADDR" \
  --rpc-url "$RPC_URL" \
  --unlocked \
  --from "$SENDER" 2>&1 || true)
echo "$POOL_OUT"
POOL_ADDR=$(echo "$POOL_OUT" | sed -n 's/.*Deployed to: \(0x[0-9a-fA-F]\{40\}\).*/\1/p' | tail -n1)
if [ -z "$POOL_ADDR" ]; then
  echo "Failed to deploy ShieldedPool" >&2
  exit 1
fi

# Write addresses to deployments/local.json
mkdir -p deployments
printf '{"verifier":"%s","shieldedPool":"%s"}\n' "$VERIFIER_ADDR" "$POOL_ADDR" > deployments/local.json
echo "Deployment complete. Addresses:"
cat deployments/local.json || true
