# syntax=docker/dockerfile:1
FROM ghcr.io/foundry-rs/foundry:latest

WORKDIR /work/contracts

# Default envs; can be overridden by compose
ENV ANVIL_HOST=0.0.0.0 \
    ANVIL_PORT=8545 \
    FOUNDRY_DISABLE_NIGHTLY_WARNING=1

# Use entrypoint to start anvil and deploy contracts
ENTRYPOINT ["bash", "-lc", "chmod +x ./docker/chain-entry.sh ./docker/deploy.sh && ./docker/chain-entry.sh"]

EXPOSE 8545

