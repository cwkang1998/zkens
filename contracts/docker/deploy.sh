#!/usr/bin/env bash
set -euo pipefail

RPC_URL=${RPC_URL:-http://anvil:8545}
SENDER=${SENDER:-0xF39Fd6e51aad88F6F4ce6aB8827279cffFb92266}
# Some foundry/cast code paths require ETH_FROM even when --from/--unlocked are provided.
# Export it to ensure the unlocked Anvil account is recognized.
export ETH_FROM="$SENDER"

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

echo "Deploying contracts using cast with unlocked account ..."
# Re-check RPC availability before broadcasting
for i in $(seq 1 60); do
  if cast chain-id --rpc-url "$RPC_URL" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# Helper to extract fields from JSON or plain output
extract_json_field() {
  local input="$1" key="$2"
  # Try JSON greedy match first, then fallback to plain text variants
  echo "$input" | sed -n "s/.*\"${key}\":\"\(0x[0-9a-fA-F]\{40,66\}\)\".*/\1/p" | head -n1
}

# 1) Deploy VerifierMock via raw bytecode
echo "Building bytecode and deploying VerifierMock ..."
VERIFIER_BYTECODE=$(forge inspect src/VerifierMock.sol:VerifierMock bytecode)
if [ -z "$VERIFIER_BYTECODE" ]; then
  echo "Failed to obtain VerifierMock bytecode" >&2
  exit 1
fi

VERIFIER_SEND_OUT=$(cast send \
  --rpc-url "$RPC_URL" \
  --from "$SENDER" \
  --unlocked \
  --create "$VERIFIER_BYTECODE" \
  --json 2>&1 || true)

# Extract tx hash, then receipt for contractAddress
VERIFIER_TX=$(extract_json_field "$VERIFIER_SEND_OUT" transactionHash)
if [ -z "$VERIFIER_TX" ]; then
  # Fallback: try to pull from non-JSON output
  VERIFIER_TX=$(echo "$VERIFIER_SEND_OUT" | sed -n 's/.*transactionHash[": ]*\(0x[0-9a-fA-F]\{64\}\).*/\1/p' | head -n1)
fi
if [ -z "$VERIFIER_TX" ]; then
  echo "Failed to broadcast VerifierMock creation tx" >&2
  echo "$VERIFIER_SEND_OUT" >&2
  exit 1
fi

VERIFIER_RECEIPT=$(cast receipt "$VERIFIER_TX" --rpc-url "$RPC_URL" --json 2>/dev/null || true)
VERIFIER_ADDR=$(extract_json_field "$VERIFIER_RECEIPT" contractAddress)
if [ -z "$VERIFIER_ADDR" ]; then
  # Fallback: try plain output
  VERIFIER_ADDR=$(echo "$VERIFIER_RECEIPT" | sed -n 's/.*contractAddress[": ]*\(0x[0-9a-fA-F]\{40\}\).*/\1/p' | head -n1)
fi
if [ -z "$VERIFIER_ADDR" ]; then
  echo "Failed to obtain VerifierMock address" >&2
  echo "$VERIFIER_SEND_OUT" >&2
  echo "$VERIFIER_RECEIPT" >&2
  exit 1
fi
echo "VerifierMock deployed at $VERIFIER_ADDR"

# 2) Deploy ShieldedPool with constructor arg (verifier)
echo "Building bytecode and deploying ShieldedPool ..."
POOL_BYTECODE=$(forge inspect src/ShieldedPool.sol:ShieldedPool bytecode)
if [ -z "$POOL_BYTECODE" ]; then
  echo "Failed to obtain ShieldedPool bytecode" >&2
  exit 1
fi
POOL_ARGS=$(cast abi-encode "constructor(address)" "$VERIFIER_ADDR" | sed 's/^0x//')
POOL_CREATE_DATA="${POOL_BYTECODE}${POOL_ARGS}"

POOL_SEND_OUT=$(cast send \
  --rpc-url "$RPC_URL" \
  --from "$SENDER" \
  --unlocked \
  --create "$POOL_CREATE_DATA" \
  --json 2>&1 || true)

POOL_TX=$(extract_json_field "$POOL_SEND_OUT" transactionHash)
if [ -z "$POOL_TX" ]; then
  POOL_TX=$(echo "$POOL_SEND_OUT" | sed -n 's/.*transactionHash[": ]*\(0x[0-9a-fA-F]\{64\}\).*/\1/p' | head -n1)
fi
if [ -z "$POOL_TX" ]; then
  echo "Failed to broadcast ShieldedPool creation tx" >&2
  echo "$POOL_SEND_OUT" >&2
  exit 1
fi

POOL_RECEIPT=$(cast receipt "$POOL_TX" --rpc-url "$RPC_URL" --json 2>/dev/null || true)
POOL_ADDR=$(extract_json_field "$POOL_RECEIPT" contractAddress)
if [ -z "$POOL_ADDR" ]; then
  POOL_ADDR=$(echo "$POOL_RECEIPT" | sed -n 's/.*contractAddress[": ]*\(0x[0-9a-fA-F]\{40\}\).*/\1/p' | head -n1)
fi
if [ -z "$POOL_ADDR" ]; then
  echo "Failed to deploy ShieldedPool" >&2
  echo "$POOL_SEND_OUT" >&2
  echo "$POOL_RECEIPT" >&2
  exit 1
fi
echo "ShieldedPool deployed at $POOL_ADDR"

# Write addresses to deployments/local.json
mkdir -p deployments
printf '{"verifier":"%s","shieldedPool":"%s"}\n' "$VERIFIER_ADDR" "$POOL_ADDR" > deployments/local.json
echo "Deployment complete. Addresses:"
cat deployments/local.json || true
