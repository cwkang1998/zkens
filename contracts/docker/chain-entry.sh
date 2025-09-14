#!/usr/bin/env bash
set -euo pipefail

# Start Anvil in background
ANVIL_HOST=${ANVIL_HOST:-0.0.0.0}
ANVIL_PORT=${ANVIL_PORT:-8545}
echo "Starting anvil on ${ANVIL_HOST}:${ANVIL_PORT} ..."
anvil \
  --host "${ANVIL_HOST}" \
  --port "${ANVIL_PORT}" \
  --chain-id 31337 \
  --mnemonic "test test test test test test test test test test test junk" \
  --block-time 1 &
ANVIL_PID=$!

cleanup() {
  echo "Shutting down anvil (pid ${ANVIL_PID}) ..."
  kill ${ANVIL_PID} 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Wait for RPC to be ready
RPC_URL=${RPC_URL:-http://127.0.0.1:${ANVIL_PORT}}
echo "Waiting for RPC at $RPC_URL ..."
for i in $(seq 1 120); do
  if cast chain-id --rpc-url "$RPC_URL" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# Run deployment using the shared script
echo "Running deployment to $RPC_URL ..."
export RPC_URL
bash ./docker/deploy.sh

echo "Anvil running. Press Ctrl+C to stop."
wait ${ANVIL_PID}

