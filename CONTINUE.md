# Continue from here

Coordination doc for the two-builder team. Update at the end of each working
session — this file is the single source of truth for "where are we right now."

> **Last updated:** 2026-05-09 — Builder A (dev multisig live + `DEV_MULTISIG`
> populated; merged Builder B's CONTINUE.md update advertising **PR #4** —
> programs deployed to devnet, RealClient ready for the `appStubClient` swap)

## Where we are

- **Calendar date:** 2026-05-09
- **Day per plan:** D7 of 10 (see [`BUILD_PLAN.md`](./BUILD_PLAN.md))
- **Deadline:** **2026-05-11** — **2 days remaining**
- **State:** Both builders unblocked on each other. Top gate: **Builder A
  reviews + merges PR #4**, then swaps `appStubClient` → `createRealClient`.
  Compressed plan holds: D9 = final cut + submit on 2026-05-11.

## What's shipped

**On `main`:**
- `c8406d3` PR #1 — Builder B planning surface (PRD, STATUS, CLAUDE.md, Anchor
  scaffold, `@riskclaw/onchain` skeleton, Arcium `threshold_compare` @ 464M ACU).
- `ae68fee` PR #2 — Builder A foundation (Phantom + G1 ack + deadline +
  `agents/src/run.ts` REDUCE→EXIT).
- `75f695e` PR #3 — Builder A's `app/` (policy + audit), Helius observer,
  Squads scaffold, `config/devnet.ts`.

**On `builder-b/foundation` (PR #4 open, awaiting Builder A review):**
- `78c6118` **P-5/P-6/P-7** — RiskPolicy schema (185 bytes) + init/update with
  Squads `Signer + has_one`. T-28 ✓ 3/3.
- `56ac103` **P-9/P-10/P-10b** — `swig_delegation::execute_rebalance` with B3
  idempotency + slippage gate + `NotImplemented` for Reduce/Hedge. T-29 + T-29b ✓ 5/5.
- `5d16261` **Pkg-15..22** — `RealClient` + 7 typed errors + `encryptThreshold`
  (placeholder packing, `RISKCLAW_V1_STUB` tag at bytes [48..64]) + ids/PDAs +
  FR-5b throttle cache + FR-8b idempotency catch. T-31b + T-32 ✓ 11/11 (251ms).
- `6d3b562` **S-24** — `deploy-devnet.ts` (idempotent, `--dry-run`,
  auto-patches `config/devnet.ts`).
- Schema fix in P-9: `last_rebalanced_at` moved off `RiskPolicy` →
  `LastRebalanced` PDA owned by `swig_delegation` (cross-program ownership).
  193 → 185 bytes; PRD §2.1 + §9 updated.

**Devnet — live (2026-05-09):**
- **Programs deployed** (PR #4 wires these into `config/devnet.ts`):
  - `risk_policy = FNThNjwxtdVSttM1Q9R81pKbiSF7jCzt8vE22A4PHrzN`
  - `swig_delegation = 9ECtiz1EnfKnVDYFKn4GofXGeoCZHupqN2GPkcgL9zBo`
  - Builder B authority: `2JAmdww5RrzMhFsYcypagtNuHE466vbQ1wBKstuDs24W`
    (2.76 SOL remaining).
- **Dev multisig** — Squads V4 1-of-1 PDA
  `BpwBRaBoHj2it821Knv2WpKB67gC6rgfg7KRdBNHHqme` (creation tx
  `4jM44923LgX9nPpsVGst5tyThMCGZgAiTXpf9PXwQSVWPcgv3HGhvH2Lr2Nc1vvV6R1ipKZRbUj8az2FXAJpNVm2`).
  Operator + sole signer = `Fzfjam6sgSjRSPNAZPZCpfwmRyAKvwSgZMvzLqcmsNnP`
  (Builder A's devnet keypair at `~/.config/solana/id.json`, 5 SOL via web faucet).
  `config/devnet.ts::DEV_MULTISIG` populated; policy editor submit gate
  (`isMultisigConfigured()`) flips live with Phantom connected.
- Solana CLI 3.1.15 installed at
  `/Users/truuhome/.local/share/solana/install/active_release/bin`.

**Verified state:**
- `agents/` typecheck clean (`bun run typecheck` passes).
- `app/` typecheck clean (`bunx tsc --noEmit` clean post-`DEV_MULTISIG` edit).
- `scripts/` typecheck clean; `bun run create-multisig` succeeds end-to-end.
- `programs/`: `risk_policy` + `swig_delegation` real implementations shipped — 8/8 anchor tests pass.
- `packages/onchain`: **`RealClient` shipped** with FR-5b cache + FR-8b
  idempotency + 7 typed errors + `encryptThreshold`. 11/11 bun tests pass.
- `encrypted/threshold_compare`: Arcis IR compiled (compare circuit, 464M ACU).

## What's blocked / pending coordination

- **PR #4 review + merge** — Builder A action; Builder B's entire devnet
  surface (program IDs in `config/devnet.ts`, `RealClient`, deploy script) is
  gated on this. After merge: Builder A pulls `main` and swaps `app/lib/onchain.ts`.
- **Helius API key** — `agents/.env` not yet created; observer can't connect
  to `wss://devnet.helius-rpc.com` until `HELIUS_API_KEY` is set. Builder A:
  sign up at helius.dev (developer plan) → `cp agents/.env.example
  agents/.env` → paste devnet key. ~5 min.
- **Real Arcium encryption** — Builder B's `encryptThreshold` ships placeholder
  packing for v1 (auditable `RISKCLAW_V1_STUB` tag). Real RescueCipher
  envelope wires up post-C-14 when `MXE_CLUSTER_PUBKEY` is set. PRD §9: no
  plaintext logging on the swap.
- **C-14 Arcium runtime — deferred.** Localnet startup wall blocks the E2E
  test path; v1 ships with FR-5b stub returning a deterministic mock from
  `drawdownBps`. PRD §7 R1 fallback documented. Stretch goal post-PR-#4 merge.
- **Tick-rate / rate-limit / write-idempotency — resolved** in PRD §2.4
  FR-5b/FR-8b. Observer's 5s tick + `run.ts` analyst loop are safe.

## Builder A — next concrete action

**Goal:** Merge PR #4, swap to `RealClient`, run paired devnet test.

1. **Review + merge PR #4** (`builder-b/foundation` → `main`). After merge,
   pull `main` so `RISK_POLICY_PROGRAM_ID` + `SWIG_DELEGATION_PROGRAM_ID`
   land locally.
2. **Helius:** sign up at helius.dev → devnet API key → `cp agents/.env.example
   agents/.env` → paste `HELIUS_API_KEY`. Verify with `cd agents && bun run
   dev` (Helius WS subscriptions on POSITION_IDS, no auth errors).
3. **Swap stubs to real:** `app/lib/onchain.ts` import `createRealClient` from
   `@riskclaw/onchain` instead of `appStubClient`; replace
   `encryptThresholdStub` with `encryptThreshold` from the package. Form/UI
   shapes are isomorphic — no UI change required.
4. **Wire `/app/audit` to live program events** — replace `generateDemoEvents()`
   with `program.addEventListener("ThresholdCheckEvent", …)` +
   `"RebalanceExecutedEvent"`. `AuditEvent` shapes already mirror Builder B's
   payloads.
5. **Paired devnet test with Builder B:** Phantom → policy editor → propose →
   multisig (`BpwBRaBoHj2it821Knv2WpKB67gC6rgfg7KRdBNHHqme`) executes →
   observer drift breach → audit page renders the real event.

**DoD:**
- PR #4 merged; program IDs live in `config/devnet.ts`.
- Helius observer connects on devnet with no auth error.
- Policy editor submit produces a real `setEncryptedPolicy` tx (1-of-1 auto-execute).
- `/app/audit` lists at least one real `ThresholdCheckEvent` after a paired
  demo run.

**Estimated time:** ~3–4 hours of net Builder A work.

## Builder B — next concrete action

**Goal:** Paired devnet test with Builder A (gated on PR #4 merge).

1. Builder A reviews + merges PR #4.
2. Builder A pulls main + swaps `app/lib/onchain.ts` → `createRealClient`.
3. Multisig already live (`DEV_MULTISIG` populated 2026-05-09).
4. Paired session: Builder A submits policy via `/app/policy` → real
   `setEncryptedPolicy` tx; Builder B verifies on Solana Explorer +
   `RebalanceExecutedEvent` fires after a synthetic breach.

**Stretch (if time):** C-14 Arcium runtime wiring. Localnet startup wall
remains; alternative is `anchor test` against Rust-only T-30b (Analyst-only
Signer rejection) without real MPC.

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
"Where we are", flag new blockers. Keep under 150 lines — day-by-day belongs
in [`BUILD_PLAN.md`](./BUILD_PLAN.md).
