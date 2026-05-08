# Continue from here

Coordination doc for the two-builder team. Update at the end of each working
session — this file is the single source of truth for "where are we right now."

> **Last updated:** 2026-05-08 — Builder B (Stream F 100% + C-12 + C-13 done; Q1 kill-switch resolved via OrbStack)

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
- Planning surface — CLAUDE.md + PRD + STATUS (commits `4f29b38`..`75c1666`).
- **F-2 Anchor scaffold** (`5179cc5`): `anchor build` clean for `risk_policy` + `swig_delegation`.
- **F-4 `@riskclaw/onchain` skeleton** (`c7c9c52`): typecheck clean both sides of the boundary.
- **F-3 + C-12 Arcium scaffold** (`0890c77`): `arcium init threshold_compare`; Hello World `add_together` compiles. **Q1 KILL-SWITCH RESOLVED.**
- **C-13 `compare(threshold, score)` circuit** (`c9140f7`): replaces Hello World per PRD §2.3; privacy-invariant comment in code; `arcium build` exit 0; `build/compare.arcis.ir` (464M ACU).
- **F-1 toolchain locally**: Rust 1.95.0 / Solana 3.1.14 / Anchor 1.0.2 / Yarn 1.22.22 / bun 1.3.11 / **Docker 29.4.0 via OrbStack** / Arcium 0.9.7.

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
- **G1 mitigation** — option C is the PRD default; `REVIEW THIS CHOICE` marker
  open until Builder B confirms or overrides before coding `queue_threshold_check`.
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
- **Tick-rate, rate-limit + write-idempotency — resolved in PRD §2.4 FR-5b/FR-8b.**
  `run.ts`'s tick-driven loop is safe: read throttles to 5s; write absorbs
  `RebalanceTooSoon` (30s) silently. No debouncing needed on Builder A's side.

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

**Goal:** P-5..P-7 — `RiskPolicy` account schema + `init_policy` + `update_policy` with Squads `Signer + has_one` constraint (PRD §2.1).

```bash
cd programs
# Edit programs/risk_policy/src/{lib.rs, state.rs, instructions/, error.rs}
# 1. RiskPolicy account: 193 bytes via #[derive(InitSpace)] — see PRD §2.1 schema
#    (owning_multisig_vault, ciphertext_ref [u8;64], arcium_handle [u8;32],
#     policy_hash, updated_at, last_check_at, last_rebalanced_at, bump)
# 2. init_policy(ciphertext_ref, arcium_handle) — Squads vault PDA Signer
# 3. update_policy(...) — has_one = owning_multisig_vault (rejects non-vault)
anchor build
anchor test   # T-28 risk_policy.ts
```

**Definition of done:**
- `anchor build` clean.
- T-28 happy-path: vault signs init_policy → policy PDA exists with correct fields.
- T-28 reject-path: non-vault signer attempts update_policy → fails with `ConstraintHasOne` or `ConstraintSigner`.
- No plaintext score / threshold logged anywhere (PRD §9 invariant).

**After P-5..P-7:** P-9/P-10/P-10b (swig_delegation execute_rebalance + slippage gate + B3 idempotency), then C-14 (Arcium wiring — Hello World host code already shows the exact `queue_computation` + `#[arcium_callback]` pattern).

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
