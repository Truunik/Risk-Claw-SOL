# /app — operator console

Builder A territory. Next.js operator console for treasury operators.

## Status (2026-05-08)

Scaffolded. Phantom Connect button + connected pubkey render on devnet. Squads
multisig wiring, policy editor, and audit trail viewer are pending.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind v4, Turbopack) — bootstrapped
  with `create-next-app` per the BUILD_PLAN spec.
- **`@solana/web3.js` + `@solana/wallet-adapter-react{,-ui}` + Phantom adapter** —
  see `app/wallet-provider.tsx` for the provider tree, `app/page.tsx` for the
  connect button.

## Run

```bash
cd app
bun install   # already done if you cloned post-2026-05-08
bun run dev   # dev server on :3000
bun run build # production build (also runs typecheck)
```

Open [http://localhost:3000](http://localhost:3000), click the Phantom button,
approve devnet — pubkey renders below the button.

## What lives here next

- Squads multisig integration: policy proposals are multisig-gated
- Policy editor: drawdown limits, exposure caps, counterparty rules
- Audit trail viewer: every Guardian action with delegation provenance

## Boundary with Builder B

The app uses `@riskclaw/onchain` (Builder B's package) for every onchain call.
Never call `Connection` or `sendTransaction` from app code directly. The one
exception today is the wallet adapter's `ConnectionProvider`, which only
provides RPC for read-only wallet queries — all program calls go through the
boundary package.
