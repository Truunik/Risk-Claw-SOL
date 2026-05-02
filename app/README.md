# /app — operator console

Builder A territory. Next.js operator console for treasury operators.

## Setup

This directory is intentionally empty. Builder A scaffolds Next.js inside it
on D1 (2026-05-03):

```bash
cd app
npx create-next-app@latest . --typescript --app --tailwind --no-src --import-alias "@/*"
bun add @solana/web3.js
# Phantom Connect React Starter Template — see Colosseum sponsor docs
```

## What lives here

- Phantom wallet connection (treasury operator's existing wallet)
- Squads multisig integration: policy proposals are multisig-gated
- Policy editor: drawdown limits, exposure caps, counterparty rules
- Audit trail viewer: every Guardian action with delegation provenance

## Boundary with Builder B

The app uses `@riskclaw/onchain` (Builder B's package) for every onchain call.
Never call `Connection` or `sendTransaction` from app code directly.
