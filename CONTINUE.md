# Continue from here

Coordination doc for the two-builder team. Update at the end of each working
session — this file is the single source of truth for "where are we right now."

> **Last updated:** 2026-05-09 — Builder B (4 atomic feat commits: P-5..P-7, P-9..P-10b, Pkg-15..22, S-24; 19 tests pass; Stream P 6/8, Pkg 6/8, S 1/3)

## Where we are

- **Calendar date:** 2026-05-09
- **Day per plan:** D7 of 10
- **Deadline:** **2026-05-11** — **2 days remaining**
- **State:** All Builder B program/package implementation is shipped except
  P-11 (Swig CPI, Q2 spike), C-14 (Arcium runtime, localnet wall), and Pkg-20
  (Metaplex Core). Builder A is unblocked for `appStubClient` → `RealClient` swap.

## What's shipped

**On `main`:**
- `c8406d3` PR #1 — Builder B planning surface (PRD, STATUS, CLAUDE.md).
- `ae68fee` PR #2 — Builder A foundation (Phantom + G1 ack + deadline + run.ts EXIT).
- `75f695e` PR #3 — Builder A's `app/` (policy + audit), Helius observer, Squads scaffold, `config/devnet.ts`.

**On `builder-b/foundation` (PR pending):**
- `78c6118` **P-5/P-6/P-7** RiskPolicy schema (185 bytes) + init/update with Squads `Signer + has_one`. T-28 ✓ 3/3.
- `56ac103` **P-9/P-10/P-10b** swig_delegation::execute_rebalance with B3 idempotency + slippage gate + NotImplemented for Reduce/Hedge. T-29 + T-29b ✓ 5/5.
- `5d16261` **Pkg-15..22** RealClient + 7 typed errors + encryptThreshold (placeholder packing, RISKCLAW_V1_STUB tag) + ids/PDAs + FR-5b throttle cache + FR-8b idempotency catch. T-31b + T-32 ✓ 11/11 (251ms).
- `6d3b562` **S-24** deploy-devnet.ts (idempotent, --dry-run, auto-patches config/devnet.ts).
- `6367516` STATUS refresh.

Schema fix in P-9 commit: `last_rebalanced_at` moved off RiskPolicy → `LastRebalanced` PDA owned by swig_delegation (Solana ownership rules — risk_policy can't be mutated cross-program). 193 → 185 bytes; PRD §2.1 + §9 updated.
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
- `packages/onchain`: **RealClient shipped** with FR-5b cache + FR-8b idempotency catch + 7 typed errors + encryptThreshold (placeholder packing). 11/11 bun tests pass.
- `programs/`: **risk_policy + swig_delegation real implementations shipped** — 8/8 anchor tests pass.
- `encrypted/threshold_compare`: Arcis IR compiled (compare circuit, 464M ACU).

## What's blocked / pending coordination

- **Devnet deploy** — `bun run deploy-devnet` from `scripts/` is ready (idempotent, --dry-run). Needs ≥4 SOL airdrop on `~/.config/solana/id.json`; once run, populates `RISK_POLICY_PROGRAM_ID` + `SWIG_DELEGATION_PROGRAM_ID` in `config/devnet.ts`. **Either builder can run this.**
- **Multisig setup** — Builder A's `bun run create-multisig` still pending (~5 min, requires devnet SOL).
- **Real Arcium encryption** — Builder B's `encryptThreshold` ships placeholder packing for v1 (RISKCLAW_V1_STUB tag at bytes [48..64] — auditable). Real RescueCipher wires up post-C-14 when real `MXE_CLUSTER_PUBKEY` is set.
- **C-14 Arcium runtime** — deferred. localnet startup wall blocks the E2E test path; v1 ships with FR-5b stub returning deterministic mock from drawdownBps. PRD §7 R1 fallback documented.

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

**Goal:** Get programs onto real devnet so Builder A's swap unblocks.

```bash
solana airdrop 5 --url devnet                 # may need to retry if rate-limited
cd scripts
bun run deploy-devnet                         # idempotent; auto-patches config/devnet.ts
```

**DoD:**
- `RISK_POLICY_PROGRAM_ID` + `SWIG_DELEGATION_PROGRAM_ID` populated in `config/devnet.ts`.
- Builder A imports `RealClient` from `@riskclaw/onchain` and replaces `appStubClient`.
- Real `setEncryptedPolicy` + `executePrivateRebalance` work end-to-end on devnet.

**After deploy:** paired demo recording (Builder A drives the screen, Builder B verifies the program-side events). Stretch: C-14 Arcium wiring if localnet startup can be cracked.

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
