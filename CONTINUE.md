# Continue from here

Coordination doc for the two-builder team. Update at the end of each working
session — this file is the single source of truth for "where are we right now."

> **Last updated:** 2026-05-09 (D7+) — Builder B (**PR #5 open** — bundled
> `riskPolicyIdl` + `swigDelegationIdl` into `@riskclaw/onchain` so Builder
> A's RealClient swap unblocks without Anchor CLI; plus S-23 agent NFTs +
> T-34 audit + step-by-step swap guide)

## Where we are

- **Calendar date:** 2026-05-09
- **Day per plan:** D7 of 10 (see [`BUILD_PLAN.md`](./BUILD_PLAN.md))
- **Deadline:** **2026-05-11** — **2 days remaining**
- **State:** PR #4 in `main`, programs live on devnet, Helius streaming, real
  encryptThreshold producing 64-byte ciphertext with `RISKCLAW_V1_STUB` tag.
  Top gate now: **RealClient swap blocked** — `@riskclaw/onchain` doesn't
  bundle the program IDLs, and `anchor build` isn't on Builder A's device.
  Maroua needs to commit `programs/target/idl/*.json` into the package (or
  Builder A installs Anchor CLI). D8 = audit-events wire + paired devnet test.

## What's shipped

**On `main`:**
- `c8406d3` PR #1 — Builder B planning surface (PRD, STATUS, Anchor scaffold,
  `@riskclaw/onchain` skeleton, Arcium `threshold_compare` @ 464M ACU).
- `ae68fee` PR #2 — Builder A foundation (Phantom + G1 ack + deadline +
  `agents/src/run.ts` REDUCE→EXIT).
- `75f695e` PR #3 — Builder A's `app/` (policy + audit), Helius observer,
  Squads scaffold, `config/devnet.ts`.
- `68ca34a` **PR #4** — Builder B's full implementation: `risk_policy` +
  `swig_delegation` Anchor programs (P-5..P-10b), `RealClient` + typed errors
  + FR-5b/FR-8b throttle (Pkg-15..22), `deploy-devnet.ts` (S-24), devnet
  smoke (3/3 onchain). Programs live: `risk_policy = FNThNj…PHrzN`,
  `swig_delegation = 9ECtiz…L9zBo`. 8/8 anchor + 11/11 bun tests pass per
  Maroua + verified locally (bun side).
- (uncommitted, ready) `app/policy` swap: `encryptThresholdStub` →
  `encryptThreshold` from `@riskclaw/onchain`. Real `RISKCLAW_V1_STUB` tag at
  bytes [48..64]; `app/lib/encrypt.ts` deleted (orphan). `bunx tsc` clean.

**Devnet — live (2026-05-09):**
- Programs: `risk_policy = FNThNj…PHrzN`, `swig_delegation = 9ECtiz…L9zBo`
  (Builder B authority `2JAmdww…s24W`, ~2.76 SOL remaining).
- Dev multisig: Squads V4 1-of-1 PDA `BpwBRaBoHj2it821Knv2WpKB67gC6rgfg7KRdBNHHqme`
  (operator + sole signer = `Fzfjam6sgSjRSPNAZPZCpfwmRyAKvwSgZMvzLqcmsNnP`,
  Builder A's keypair at `~/.config/solana/id.json`, 4.99 SOL).
  `config/devnet.ts::DEV_MULTISIG` populated.
- Helius: developer plan key in `agents/.env`. `bun run dev` opens
  `wss://devnet.helius-rpc.com` clean (`[observer] ws open (1 positions)`).
- Solana CLI 3.1.15. Anchor CLI **not** on Builder A's device.

**Verified state:**
- `agents/` + `app/` + `scripts/` + `packages/onchain` typecheck clean.
- `packages/onchain`: 11/11 bun tests pass locally (T-31b throttle + T-32 encrypt).
- `programs/`: 8/8 anchor tests pass per Maroua (not re-verified locally — no Anchor CLI).
- `encrypted/threshold_compare`: Arcis IR compiled (compare circuit, 464M ACU).

## What's blocked / pending coordination

- **RealClient swap blocked on IDL bundling** — `app/lib/onchain.ts` still
  uses `appStubClient`. `createRealClient` requires `riskPolicyIdl` +
  `swigDelegationIdl` JSONs (produced by `anchor build`). The deploy used
  `--no-idl`, so on-chain fetch is closed too. **Action: Builder B commits
  `programs/target/idl/{risk_policy,swig_delegation}.json` into
  `@riskclaw/onchain` and re-exports them**, OR Builder A installs Anchor
  CLI via `cargo install --git https://github.com/coral-xyz/anchor avm`
  (~5–10 min). Builder B path is cheaper.
- **Real Arcium encryption** — `encryptThreshold` ships v1 placeholder
  packing (auditable `RISKCLAW_V1_STUB` tag). Real RescueCipher envelope
  wires up post-C-14 when `MXE_CLUSTER_PUBKEY` is set. PRD §9: no plaintext
  logging on the swap.
- **C-14 Arcium runtime — deferred.** Localnet startup wall blocks the E2E
  test path; v1 ships with FR-5b stub returning a deterministic mock from
  `drawdownBps`. PRD §7 R1 fallback documented. Stretch goal.

## Builder A — next concrete action

**Goal:** Land RealClient swap, wire live audit events, run paired devnet test.

1. **Commit + push the encrypt swap** (already on disk):
   `app/app/policy/page.tsx` mod + `app/lib/encrypt.ts` deletion.
   `feat(app): swap encryptThresholdStub → @riskclaw/onchain encryptThreshold`.
2. **Wait on Builder B's IDL bundle**, then swap `appStubClient` →
   `createRealClient`. Pass `connection` from `useConnection()` and a wallet
   adapter from `useWallet()` shimmed to `anchor.Wallet`. Form/UI shapes are
   isomorphic — no UI change.
3. **Wire `/app/audit` to live program events** — replace `generateDemoEvents()`
   with `program.addEventListener("ThresholdCheckEvent", …)` +
   `"RebalanceExecutedEvent"`. `AuditEvent` shapes already mirror Builder B's
   payloads.
4. **Paired devnet test:** Phantom → policy editor → propose → multisig
   `BpwBRa…HHqme` executes → observer drift breach → audit page renders the
   real event.

**DoD:**
- Policy editor submit produces a real `setEncryptedPolicy` tx (1-of-1 auto-exec).
- `/app/audit` lists at least one real `ThresholdCheckEvent` post-paired run.

**Estimated time:** ~2–3 hours net once IDLs land.

## Builder B — next concrete action

**Goal:** Unblock RealClient swap, then paired devnet test.

1. **Bundle the program IDLs** in `@riskclaw/onchain`. Commit
   `programs/target/idl/{risk_policy,swig_delegation}.json` and re-export
   from `packages/onchain/src/index.ts` so Builder A can wire
   `createRealClient` without `anchor build`. This is the critical-path gate.
2. Paired session post-swap: verify `setEncryptedPolicy` + a synthetic
   `RebalanceExecutedEvent` fire on devnet.

**Stretch:** C-14 Arcium runtime wiring (localnet wall remains; Rust-only
T-30b Analyst-Signer-rejection is the alternative).

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
