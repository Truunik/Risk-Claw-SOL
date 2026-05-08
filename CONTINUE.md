# Continue from here

Coordination doc for the two-builder team. Update at the end of each working
session — this file is the single source of truth for "where are we right now."

> **Last updated:** 2026-05-08 — Builder A (PR #1 merged; deadline corrected to 2026-05-11; Phantom wallet shipped; G1 confirmed; BUILD_PLAN drift fixed)

## Where we are

- **Calendar date:** 2026-05-08
- **Day per plan:** D6 of 10 (see [`BUILD_PLAN.md`](./BUILD_PLAN.md) day-by-day)
- **Deadline:** **2026-05-11** — **3 days remaining** (corrected from 2026-05-13;
  verified on colosseum.com/frontier on 2026-05-08)
- **Slip:** Builder B caught up; Builder A foundation now shipping. Plan is
  compressed: D9 = final cut + submit on 2026-05-11. D10/D11 obsolete.

## What's shipped

**On `main`:**
- `8d2cca3` — workspace scaffold + three-zone agents skeleton (Builder A)
- `48c03ea` — institutional reposition of README + BUILD_PLAN (Builder A)
- `8bc3a91`..`b794c27` — CONTINUE.md handoff doc (Builder A)
- `c8406d3` — **PR #1 merged** (Builder B planning surface, Anchor scaffold,
  `@riskclaw/onchain` skeleton, Arcium `threshold_compare` circuit). Includes:
  - Planning surface — CLAUDE.md + PRD + STATUS
  - **F-2 Anchor scaffold**: `anchor build` clean for `risk_policy` + `swig_delegation`
  - **F-4 `@riskclaw/onchain` skeleton**: typecheck clean both sides of the boundary
  - **F-3 + C-12 Arcium scaffold**: `arcium init threshold_compare`. Q1 KILL-SWITCH RESOLVED.
  - **C-13 `compare(threshold, score)` circuit**: replaces Hello World per PRD §2.3; `build/compare.arcis.ir` (464M ACU)

**On `builder-a/foundation` (PR pending):**
- **Phantom wallet shipped in `/app`**: Next.js 16 + Tailwind v4 + Phantom adapter on devnet. `bun run build` clean. WalletMultiButton renders, connected pubkey shows.
- **G1 mitigation confirmed** in PRD §9: option C (Analyst `Signer` constraint) + soft option A (5s rate limit). REVIEW THIS CHOICE marker resolved — Builder B unblocked on `queue_threshold_check`.
- **BUILD_PLAN drift fixed (A1/A2/A3)**: Vanish removed from in-scope demo + integration; storyboard 1:20–1:45 retargeted to Swig bounded execution; submission checklist pruned to verified Frontier sponsors (Phantom · Altitude · Arcium · Metaplex Core); "Metaplex 014" replaced with Metaplex Core (`mpl-core`).
- **Deadline correction**: BUILD_PLAN + CLAUDE.md updated to 2026-05-11 (verified on colosseum.com/frontier).
- **`agents/src/run.ts:31` fixed**: `action: "REDUCE"` → `"EXIT"` per PRD §2.2 + FR-9; sizeBps 5000 → 10000 (full close). Comment refreshed to drop stale D5 date.

**Toolchain (local, Builder B):** Rust 1.95.0 / Solana 3.1.14 / Anchor 1.0.2 / Yarn 1.22.22 / bun 1.3.11 / **Docker 29.4.0 via OrbStack** / Arcium 0.9.7.

**Verified state:**
- `agents/` typechecks clean (`bun run typecheck` passes)
- `app/` builds clean (`bun run build` passes; static export of /, /_not-found)
- `programs/risk_policy` + `swig_delegation`: empty Anchor stubs, build clean
- `packages/onchain`: re-exports `OnchainClient` interface + shared types
- `encrypted/threshold_compare`: Arcis IR compiled
- `scripts/`: README only (Pkg-15..22 + register-agents pending)

## What's blocked / pending coordination

- **Integration contract — PR #1 merged 2026-05-08.** The 5-function
  `OnchainClient` in `agents/src/onchain-client.ts` is consumed verbatim by
  Builder B. The two additive helpers (`buildSetEncryptedPolicyIx`,
  `buildUpdateEncryptedPolicyIx`, `MXE_CLUSTER_PUBKEY`) ship with the merge.
  No signature drift on the locked interface.
- **No Squads multisig** prepared for the demo treasury. Cheap — create a
  1-of-1 dev multisig via `@sqds/multisig`. Builder A will pick this up
  alongside Squads UI wiring (next slice).
- **Tick-rate, rate-limit + write-idempotency — resolved in PRD §2.4 FR-5b/FR-8b.**
  `run.ts`'s tick-driven loop is safe: read throttles to 5s; write absorbs
  `RebalanceTooSoon` (30s) silently. No debouncing needed on Builder A's side.

## Builder A — next concrete action

**Goal:** Squads multisig + policy editor wired into the operator console.

1. Create a 1-of-1 (or 2-of-2) dev multisig via `@sqds/multisig` against
   devnet. Hardcode the multisig PDA in `app/lib/squads.ts` for v1.
2. Policy editor UI — sliders/inputs for drawdown, exposure caps, counterparty
   caps. On submit: encrypt via Arcium client (Builder B's `MXE_CLUSTER_PUBKEY`
   export) and stage a Squads multisig proposal that calls
   `buildSetEncryptedPolicyIx` (Builder B PRD §5).
3. Helius LaserStream → Observer wiring in `agents/src/observer.ts` (one Orca
   pool, hardcoded for v1).

**DoD:**
- `bun run dev` shows a connected wallet → policy form → "Propose policy update"
  button that produces a Squads proposal (multisig still 1-of-1, so it
  auto-executes locally for the demo).
- `agents/src/run.ts` boots against real Helius metrics (still on `stubClient`
  until Builder B ships Pkg-15..22).

**Estimated time:** ~6–8 hours total. Squads + form is the long pole.

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
