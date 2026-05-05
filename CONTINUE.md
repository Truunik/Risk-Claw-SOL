# Continue from here

Coordination doc for the two-builder team. Update at the end of each working
session — this file is the single source of truth for "where are we right now."

> **Last updated:** 2026-05-05 (initial setup)

## Where we are

- **Calendar date:** 2026-05-05
- **Day per plan:** D3 of 11 (see [`BUILD_PLAN.md`](./BUILD_PLAN.md) day-by-day)
- **Deadline:** 2026-05-13 — **8 days remaining**
- **Slip:** 3 days. None of D1, D2, or D3's work has been started yet.
  Plan is no longer realistic at original cadence; either compress or cut scope.

## What's shipped

Latest commit: `8d2cca3` — workspace scaffold + three-zone agents skeleton.

For full history: `git log --oneline`.

**Verified state:**
- `agents/` typechecks clean (`bun run typecheck` passes)
- `agents/src/run.ts` fails gracefully on missing env vars
- Every directory has init instructions in its README

## What's blocked / pending coordination

- **Integration contract not locked.** The TS-client signatures in
  [`BUILD_PLAN.md`](./BUILD_PLAN.md#integration-contract) were scheduled to
  lock 2026-05-04 EOD. Builder B has not yet reviewed or signed off.
  **Lock this before either side starts coding** — once either builder
  builds against an unlocked contract, rework is wasted.
- **Builder B status unknown.** Has Builder B cloned the repo? Started D1
  (Arcium kickoff)? Communicate before next session.
- **No Squads multisig prepared** for the demo treasury. Cheap — do it
  during D1.

## Builder A — next concrete action

**Goal:** Phantom "Connect Wallet" button rendering in `/app`, connected
to a real testnet wallet.

```bash
cd app
npx create-next-app@latest . --typescript --app --tailwind --no-src --import-alias "@/*"
# Then install Phantom Connect React Starter Template
# See app/README.md and Phantom Connect docs
```

**Definition of done for this slice:**
- `bun run dev` (or `npm run dev`) renders a page
- "Connect Wallet" button connects to Phantom on devnet
- Connected wallet's pubkey shows in the UI

When done: update this file's "What's shipped" + tick the Phantom item in
[`README.md`](./README.md) Status section.

**Estimated time:** 2–3 hours.

## Builder B — next concrete action

**Goal:** Working `anchor build` in `/programs` + Arcis dev environment in
`/encrypted`.

```bash
# 1. Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# 2. Install Anchor
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked

# 3. Anchor init
cd programs
anchor init . --no-git
anchor new risk_policy
anchor new swig_delegation

# 4. Read BUILD_PLAN.md "Integration contract" — approve as-is or propose
#    changes via PR before any code lands

# 5. Arcis dev env in /encrypted (https://docs.arcium.com)
```

**Definition of done for this slice:**
- `anchor build` succeeds in `/programs`
- `risk_policy` and `swig_delegation` programs scaffolded (empty handlers OK)
- Arcis tooling installed; can compile a hello-world circuit in `/encrypted`
- Integration contract either approved or counter-proposal posted

When done: update this file's "What's shipped" + tick relevant items in
[`README.md`](./README.md) Status section.

**Estimated time:** 4–5 hours.

## Where to read

- [`README.md`](./README.md) — overview, pitch, architecture, sponsor table
- [`BUILD_PLAN.md`](./BUILD_PLAN.md) — work split, integration contract, day-by-day, risks, demo storyboard, submission checklist
- [`agents/README.md`](./agents/README.md) — three-zone architecture, setup
- [`app/README.md`](./app/README.md) — Next.js + Phantom init (Builder A)
- [`programs/README.md`](./programs/README.md) — Anchor init (Builder B)
- [`encrypted/README.md`](./encrypted/README.md) — Arcis init (Builder B)

## How to update this file

After each working session:

1. Update the **Last updated** line
2. Move completed items from "next concrete action" to "What's shipped"
3. Update "Where we are" if the day/slip changed
4. Add anything blocking the other builder to "What's blocked"

Keep this file under 150 lines. If it grows past that, the day-by-day
belongs in [`BUILD_PLAN.md`](./BUILD_PLAN.md), not here.
