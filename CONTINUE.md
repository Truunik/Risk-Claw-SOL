# Continue from here

Coordination doc for the two-builder team. Update at the end of each working
session — this file is the single source of truth for "where are we right now."

> **Last updated:** 2026-05-08 — Builder A (PR #2 merged; Squads scaffold + policy editor + Helius observer + audit viewer + README status refresh on PR #3)

## Where we are

- **Calendar date:** 2026-05-08
- **Day per plan:** D6 of 10 (see [`BUILD_PLAN.md`](./BUILD_PLAN.md) day-by-day)
- **Deadline:** **2026-05-11** — **3 days remaining**
- **Slip:** Builder A foundation + first vertical slice in. Plan is compressed:
  D9 = final cut + submit on 2026-05-11. D10/D11 obsolete.

## What's shipped

**On `main` (post-PR #2):**
- `c8406d3` — **PR #1 merged** (Builder B planning surface, Anchor scaffold,
  `@riskclaw/onchain` skeleton, Arcium `threshold_compare` circuit @ 464M ACU,
  Q1 KILL-SWITCH RESOLVED).
- `ae68fee` — **PR #2 merged** (Builder A foundation): Phantom wallet on
  devnet (Next.js 16 + Tailwind v4); G1 mitigation confirmed (Analyst Signer
  + 5s rate limit) so Builder B is unblocked on `queue_threshold_check`;
  BUILD_PLAN drift A1/A2/A3 fixed; deadline corrected to 2026-05-11;
  `agents/src/run.ts` REDUCE→EXIT.

**On `builder-a/squads-policy-helius` (PR #3 pending):**
- **`config/devnet.ts`** — shared addresses (RPC, Orca whirlpool, Squads V4
  program, dev multisig PDA, future program IDs). Plain strings, zero deps,
  importable from any workspace via `@config/devnet`.
- **`scripts/`** — `@sqds/multisig` workspace. `create-multisig.ts` spins up
  a 1-of-1 Squads dev multisig and prints the PDA to paste into
  `config/devnet.ts`. Idempotent against a stable creator key.
- **Policy editor at `/app/policy`** — drawdown / max notional / max slippage
  / expiry inputs, "Propose policy update" button. Uses `appStubClient`
  (`app/lib/onchain.ts`) and `encryptThresholdStub` (`app/lib/encrypt.ts`)
  until Builder B ships `MXE_CLUSTER_PUBKEY` + `buildSetEncryptedPolicyIx`.
  Submit → 64-byte ciphertext (placeholder packing) → mock TxSig back into
  the UI.
- **Helius WS observer** — `agents/src/observer.ts` opens
  `wss://devnet.helius-rpc.com` with `accountSubscribe` for each `POSITION_IDS`
  entry, emits synthetic `PositionMetrics` on a 5s tick (drift curve crosses
  4000bps over ~60 ticks for deterministic demo firings). Real Orca whirlpool
  layout parsing flagged as v2.
- **Audit trail viewer at `/app/audit`** — three agent-zone identity cards
  (READ/COMPUTE/EXECUTE with pubkey + Core mint) and a chronological event
  table (`agent-registered`, `policy-set`, `threshold-check`, `rebalance-executed`).
  Synthetic events from `app/lib/audit.ts::generateDemoEvents()` for v1; swap
  to a Solana program event subscription when Builder B emits
  `ThresholdCheckEvent` + `RebalanceExecutedEvent`.
- **README + .env.example refresh** — Vanish removed throughout (post-hackathon
  roadmap), Metaplex 014 → Metaplex Core; deadline 2026-05-11; status
  checklist reflects shipped slices; POSITION_IDS defaults to the devnet
  Orca whirlpool.

**Verified state:**
- `agents/` typecheck clean (`bun run typecheck` passes)
- `app/` build clean (`bun run build` — static export of `/`, `/_not-found`,
  `/audit`, `/policy`)
- `scripts/` typecheck clean
- `programs/risk_policy` + `swig_delegation`: empty Anchor stubs (Builder B
  next: P-5..P-7)
- `packages/onchain`: still type re-exports only (Pkg-15..22 pending)
- `encrypted/threshold_compare`: Arcis IR compiled

## What's blocked / pending coordination

- **Run `scripts/create-multisig.ts`** — needs `~/.config/solana/id.json`
  funded with ≥0.1 devnet SOL. Output PDA pastes into
  `config/devnet.ts::DEV_MULTISIG`. Until then, the policy editor renders
  the form but the submit button is disabled (`multisig: not configured`).
  Builder A action; ~5 min once a devnet wallet is in place.
- **Real Arcium encryption** — `app/lib/encrypt.ts::encryptThresholdStub`
  packs JSON into a 64-byte buffer (NOT secret). Replace with the real
  RescueCipher x25519 envelope when Builder B exports `MXE_CLUSTER_PUBKEY`
  from `@riskclaw/onchain`. PRD §9 invariant: no plaintext logging on this
  swap.
- **Builder B program IDs** — `RISK_POLICY_PROGRAM_ID` /
  `SWIG_DELEGATION_PROGRAM_ID` are `null` in `config/devnet.ts`. Set them
  during Builder B's first devnet deploy.
- **Tick-rate, rate-limit + write-idempotency — resolved in PRD §2.4 FR-5b/FR-8b.**
  Observer's 5s tick + `run.ts` analyst loop are safe under FR-5b.

## Builder A — next concrete action

**Goal:** Run the multisig setup + paired devnet test once Builder B ships
P-5..P-7.

1. Run `cd scripts && bun run create-multisig` against a funded devnet
   keypair; paste the PDA into `config/devnet.ts::DEV_MULTISIG`.
2. Wire `/app/audit` to a real Solana program event subscription once
   Builder B emits `ThresholdCheckEvent` + `RebalanceExecutedEvent` —
   replace `generateDemoEvents()` with `program.addEventListener(...)`.
3. Swap `appStubClient` → `@riskclaw/onchain` and replace
   `encryptThresholdStub` with the real RescueCipher x25519 envelope
   (`MXE_CLUSTER_PUBKEY`) once Pkg-15..22 ships.
4. Paired devnet test with Builder B: full encrypt → propose →
   multisig-execute → verify policy account onchain.

**DoD:**
- `DEV_MULTISIG` populated; policy editor submit produces a real Squads
  proposal (1-of-1 auto-executes locally).
- `/app/audit` lists at least one real `ThresholdCheckEvent` after a paired
  demo run.

**Estimated time:** ~3–4 hours of net Builder A work, gated on Builder B.

## Builder B — next concrete action

**Goal:** P-5..P-7 — `RiskPolicy` account schema + `init_policy` +
`update_policy` with Squads `Signer + has_one` constraint (PRD §2.1).

```bash
cd programs
anchor build
anchor test   # T-28 risk_policy.ts
```

**DoD:**
- `anchor build` clean.
- T-28 happy-path: vault signs `init_policy` → policy PDA exists with correct fields.
- T-28 reject-path: non-vault signer attempts `update_policy` → fails with `ConstraintHasOne` or `ConstraintSigner`.
- No plaintext score / threshold logged anywhere (PRD §9 invariant).

**After P-5..P-7:** P-9/P-10/P-10b (swig_delegation execute_rebalance +
slippage gate + B3 idempotency), then C-14 (Arcium wiring — Hello World
host code already shows the exact `queue_computation` + `#[arcium_callback]`
pattern).

## Where to read

- [`README.md`](./README.md), [`BUILD_PLAN.md`](./BUILD_PLAN.md),
  [`CLAUDE.md`](./CLAUDE.md) — repo overview, work split, boundary rules
- [`agents/src/onchain-client.ts`](./agents/src/onchain-client.ts) — locked
  integration contract
- [`config/devnet.ts`](./config/devnet.ts) — shared addresses
- [`.planning/builder-b/PRD.md`](./.planning/builder-b/PRD.md) — features,
  API contracts §5, security invariants §9, execution streams §12
- [`.planning/builder-b/STATUS.md`](./.planning/builder-b/STATUS.md) —
  Builder B pipeline state, open spikes Q1–Q7

## How to update this file

End of each session: bump **Last updated**, move shipped items, refresh
"Where we are", flag new blockers. Keep under 150 lines — day-by-day
belongs in [`BUILD_PLAN.md`](./BUILD_PLAN.md).
