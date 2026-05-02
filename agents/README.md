# /agents — three-zone agent stack

Builder A territory. The orchestration layer.

## Zone separation (load-bearing)

- `src/observer.ts` — **READ zone**. No signing key, no policy access.
- `src/analyst.ts` — **COMPUTE zone**. No signing key, no plaintext threshold.
- `src/guardian.ts` — **EXECUTE zone**. Holds the only signing key, bounded by Swig.

If you import a `Keypair` into Observer or Analyst, you have broken zone
separation — and the project's load-bearing privacy claim collapses.

## Setup

```bash
cd agents
bun install
cp .env.example .env  # fill in HELIUS_API_KEY
bun run typecheck
bun run dev
```

## Boundary with Builder B

`src/onchain-client.ts` defines the only surface where this code crosses
into Builder B's territory. Currently uses `stubClient`. Once Builder B
ships `@riskclaw/onchain`, swap it in `src/run.ts`.

If you find yourself reaching for `@solana/web3.js`'s `Connection` or
`sendTransaction` directly inside `/agents`, the boundary has leaked.
Push the call back into the onchain client package.
