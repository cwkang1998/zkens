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

echo "Installing forge dependencies (forge-std) ..."
echo "workdir: $(pwd) user: $(whoami)"
if [ ! -d .git ]; then
  echo "initializing git repo in $(pwd)"
  git init
  git config user.email "devnull@example.com"
  git config user.name "foundry-bot"
  ls -la .git || true
fi
forge install foundry-rs/forge-std

echo "Building contracts ..."
forge build

echo "Deploying via forge script ..."
# Re-check RPC availability before broadcasting
for i in $(seq 1 60); do
  if cast chain-id --rpc-url "$RPC_URL" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

forge script script/Deploy.s.sol \
  --rpc-url "$RPC_URL" \
  --sender "$SENDER" \
  --unlocked \
  --broadcast

echo "Deployment complete. Addresses:"
cat deployments/local.json || true
