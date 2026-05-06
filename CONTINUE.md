# Continue from here

Coordination doc for the two-builder team. Update at the end of each working
session — this file is the single source of truth for "where are we right now."

> **Last updated:** 2026-05-06 — Builder B (PRD gaps B1–B5 closed in PR #1; BUILD_PLAN drift flagged for Builder A)

## Where we are

- **Calendar date:** 2026-05-05
- **Day per plan:** D3 of 11 (see [`BUILD_PLAN.md`](./BUILD_PLAN.md) day-by-day)
- **Deadline:** 2026-05-13 — **8 days remaining**
- **Slip:** 3 days. None of D1, D2, or D3's work has been started yet.
  Plan is no longer realistic at original cadence; either compress or cut scope.

## What's shipped

**On `main`:**
- `8d2cca3` — workspace scaffold + three-zone agents skeleton (Builder A)
- `48c03ea` — institutional reposition of README + BUILD_PLAN (Builder A)
- `8bc3a91` — this CONTINUE.md (Builder A)

**On `builder-b/foundation` (draft PR #1):**
- `4f29b38` — CLAUDE.md repo guide
- `575dd2e` + `c671baa` — `.planning/builder-b/{PRD.md, STATUS.md}` (full Builder B PRD with API contracts, security invariants including G1 side-channel mitigation, and 6-stream execution plan)

**Verified state:**
- `agents/` typechecks clean (`bun run typecheck` passes)
- `agents/src/run.ts` fails gracefully on missing env vars
- No `/programs`, `/encrypted`, `/app`, or `packages/onchain` code yet

## What's blocked / pending coordination

- **Integration contract — Builder A review needed on PR #1.** The 5-function
  `OnchainClient` in `agents/src/onchain-client.ts` is consumed verbatim by
  Builder B. PR #1 proposes two additive helpers (`buildSetEncryptedPolicyIx`,
  `MXE_CLUSTER_PUBKEY`) for the institutional Squads-proposal flow. **Builder A:
  read PRD §5 and ack so Builder B can write the package.** No signature changes
  to the locked interface — these are additions only.
- **G1 side-channel mitigation — Builder B confirm-or-override.** PRD §9 defaults
  to option C (Analyst-only `Signer` constraint on `queue_threshold_check` + 5s
  rate limit). Marked `REVIEW THIS CHOICE` in the PRD. Decide before coding.
- **Arcium kill-switch (Q1)** — does `arcup` install + `threshold_compare`
  compile on macOS? Resolve in Builder B's next session. If no, the privacy
  thesis pivots to a documented fallback per PRD §7.
- **No Squads multisig** prepared for the demo treasury. Cheap — create a
  1-of-1 dev multisig via `@sqds/multisig` in any session.
- **⚠️ BUILD_PLAN drift — Builder A action.** Three claims in BUILD_PLAN are
  inconsistent with verified facts:
  (A1) Demo storyboard at 1:20–1:45 narrates Vanish, but PRD §1 marks Vanish
  out of scope (not a Frontier sponsor; no $10k bounty exists). Suggest beat
  becomes "Routed through Solana directly; Vanish v2."
  (A2) Submission checklist lists Vanish/Helius/Swig sponsor tracks. Verified
  Frontier supporters: Altitude · Phantom · Arcium · Raydium · Coinbase ·
  World · MoonPay · Metaplex · Privy · Reflect · Superteam. Prune accordingly.
  (A3) "Metaplex 014 registry" is not in Metaplex docs. Replace with
  "Metaplex Core (`mpl-core`)" per PRD §2.5.
  Also: BUILD_PLAN deadline 2026-05-13 vs. Frontier page "April 6 – May 11."
  Verify on arena.colosseum.org.
- **⚠️ Builder A — `agents/src/run.ts:31` placeholder uses `action: "REDUCE"`;
  v1 ships only `EXIT`** (PRD §2.2 + FR-9). Change to `"EXIT"` when swapping
  `stubClient` → `RealClient`, else expect `NotImplementedError` at runtime.
- **Tick-rate / rate-limit + idempotency — both resolved in PRD.** `run.ts`
  fires on every Helius tick, but `RealClient.checkThresholdBreach` (FR-5b)
  throttles to 5s per policy returning cached results, and
  `executePrivateRebalance` (FR-8b) absorbs onchain `RebalanceTooSoon` (30s
  write-side window) by returning the prior `TxSig`. Builder A's analyst
  loop works correctly under any tick rate without debouncing.

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

**Goal:** Resolve Arcium kill-switch (Q1) — `arcup install` works + Hello World Arcis circuit compiles. Plus `anchor build` clean in `/programs`.

```bash
# Toolchain — Solana (Agave) + Anchor 1.0.2 + Arcium (verified install paths)
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

cargo install --git https://github.com/solana-foundation/anchor avm --force
avm install 1.0.2 && avm use 1.0.2

cargo install arcup
arcup install   # pulls arcium CLI + arcis compiler — Q1 KILL-SWITCH

# Anchor workspace
cd programs
anchor init . --no-git
anchor new risk_policy
anchor new swig_delegation
anchor build

# Arcis circuit — read https://docs.arcium.com/developers/hello-world first
cd ../encrypted
arcium init threshold_compare   # exact command per Hello World
```

**Definition of done:**
- `arcup install` succeeds; Hello World Arcis circuit compiles → **Q1 = YES**;
  if it fails → **Q1 = NO**, document fallback in `.planning/builder-b/STATUS.md` and notify Builder A
- `anchor build` succeeds for both programs
- `risk_policy` and `swig_delegation` scaffolded (empty handlers OK)
- Builder A has acknowledged PR #1 §5 (integration-contract additions)

When done: update "What's shipped" + tick items in [`README.md`](./README.md) Status. Do NOT start `risk_policy::init_policy` until PR #1 is acknowledged — saves rework if §5 changes.

**Estimated time:** 4–5 hours.

## Where to read

- [`README.md`](./README.md) — overview, pitch, architecture, sponsor table
- [`BUILD_PLAN.md`](./BUILD_PLAN.md) — work split, integration contract, day-by-day, risks, demo storyboard, submission checklist
- [`agents/README.md`](./agents/README.md) — three-zone architecture, setup
- [`app/README.md`](./app/README.md) — Next.js + Phantom init (Builder A)
- [`programs/README.md`](./programs/README.md) — Anchor init (Builder B)
- [`encrypted/README.md`](./encrypted/README.md) — Arcis init (Builder B)
- [`.planning/builder-b/PRD.md`](./.planning/builder-b/PRD.md) — Builder B's full plan: features, API contracts (§5), security invariants (§9), 6-stream execution (§12)
- [`.planning/builder-b/STATUS.md`](./.planning/builder-b/STATUS.md) — Builder B's live pipeline state, open spikes Q1–Q7, implementation TBDs
- [`CLAUDE.md`](./CLAUDE.md) — repo guide + boundary rules + integration-contract pointer

## How to update this file

After each working session:

1. Update the **Last updated** line
2. Move completed items from "next concrete action" to "What's shipped"
3. Update "Where we are" if the day/slip changed
4. Add anything blocking the other builder to "What's blocked"

Keep this file under 150 lines. If it grows past that, the day-by-day
belongs in [`BUILD_PLAN.md`](./BUILD_PLAN.md), not here.
