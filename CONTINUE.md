# Continue from here

Coordination doc for the two-builder team. Update at the end of each working
session — this file is the single source of truth for "where are we right now."

> **Last updated:** 2026-05-11 (D9 — submission day) — Builder B (PR #5 +
> PR #6 + PR #7 all merged; T-33 Builder A swap landed. **Live app deployed
> to Vercel at https://riskclaw-sol.vercel.app**. Repo is now public on
> GitHub. SUBMISSION.md updated with judge-friendly quick links + 3-option
> "How to run it" section. Recording + colosseum.com form submission are
> the only remaining user actions.)

## Where we are

- **Calendar date:** 2026-05-11
- **Day per plan:** D9 of 10 — **submission day** (see [`BUILD_PLAN.md`](./BUILD_PLAN.md))
- **Deadline:** **2026-05-11 (today)** — Colosseum Frontier
- **State:** PR #5, PR #6, PR #7 all in `main`. Repo is **public** on GitHub.
  Live app deployed to **https://riskclaw-sol.vercel.app** (Next.js 16 on
  Vercel; Phantom + RealClient bound to bundled IDLs; live event
  subscription on `/audit`). Builder B + Builder A surfaces both verified
  live (`bun run verify-onchain` 5/5 + `bun run e2e-smoke` 9/9 + Vercel
  prod build clean). Submission stack on main: SUBMISSION.md, RUNBOOK.md,
  DEMO_NARRATION.md, T-34 audit, transcripts.

## What's shipped

**On `main`:**
- `c8406d3` PR #1 — Builder B planning surface (PRD, STATUS, Anchor scaffold,
  `@riskclaw/onchain` skeleton, Arcium `threshold_compare` @ 464M ACU).
- `ae68fee` PR #2 — Builder A foundation (Phantom + G1 ack + deadline +
  `agents/src/run.ts` REDUCE→EXIT).
- `75f695e` PR #3 — Builder A's `app/` (policy + audit), Helius observer,
  Squads scaffold, `config/devnet.ts`.
- `68ca34a` PR #4 — Builder B's full implementation: `risk_policy` +
  `swig_delegation` Anchor programs (P-5..P-10b), `RealClient` + typed errors
  + FR-5b/FR-8b throttle (Pkg-15..22), `deploy-devnet.ts` (S-24), devnet
  smoke (3/3 onchain). Programs live: `risk_policy = FNThNj…PHrzN`,
  `swig_delegation = 9ECtiz…L9zBo`. 8/8 anchor + 11/11 bun tests pass.
- `a8bc29d` Builder A's encryptThresholdStub → `@riskclaw/onchain`
  encryptThreshold swap on `app/policy`.
- **`b47497d` PR #5 (merged 2026-05-10)** — Builder B post-#4 follow-up:
  - `6f275dd` IDL bundling (`riskPolicyIdl` + `swigDelegationIdl` exported)
  - `f76b815` S-23 agent NFTs minted on devnet (Observer/Analyst/Guardian)
  - `b15fd51` T-34 privacy invariant audit (PRD §9 invariants 1-4 PASS)
  - `a71c2ab` Builder A swap guide (`.planning/builder-a-swap-guide.md`)
  - `632bd30` S-27b e2e-smoke 9-step demo orchestrator

**Devnet — live (2026-05-10):**
- Programs: `risk_policy = FNThNj…PHrzN`, `swig_delegation = 9ECtiz…L9zBo`.
- Dev multisig: Squads V4 1-of-1 PDA `BpwBRaBoHj2it821Knv2WpKB67gC6rgfg7KRdBNHHqme`.
- Agent NFTs (Metaplex Core): Observer `AERmaK…wLQU`, Analyst `Hq5VqN…UjdoR`,
  Guardian `ERxDBE…E9YzH` — all owners gitignored at `scripts/.keys/`.
- Helius: developer plan key in `agents/.env`. WS connects clean.

**Verified state (D8):**
- `agents/` + `app/` + `scripts/` + `packages/onchain` typecheck clean.
- `packages/onchain`: 14/14 bun tests pass (encrypt + throttle + agents).
- `agents/`: 6/6 bun tests pass (zone-separation invariant — T-30b TS variant).
- `programs/`: 8/8 anchor tests pass (re-verifiable via `anchor test`).

## What's blocked / pending coordination

- **Paired devnet test (T-33)** — gated on Builder A's RealClient swap. Once
  Builder A's app calls `createRealClient` against the bundled IDLs, run
  Phantom → policy editor → multisig → observer breach → audit page e2e
  with Builder B watching the program logs. This is the demo.
- **C-14 Arcium runtime — DEFERRED.** Localnet startup wall blocks the E2E
  encryption path. v1 ships with FR-5b stub (`RISKCLAW_V1_STUB` tag, code +
  on-chain audit caveat documented). PRD §7 R1 fallback. Submission framing
  must distinguish v1 placeholder packing from v2 RescueCipher claim — see
  T-34 audit conclusion.
- **P-11 / Pkg-19** — Swig CPI for Exit + delegateToGuardian. Q2 spike (Swig
  SDK API) unresolved. v1 ships the stub; v2 work.

## Builder A — next concrete action

**Goal:** Land RealClient swap, wire live audit events, run paired devnet test.

1. **Pull `main`** — IDLs are now bundled in `@riskclaw/onchain`. No Anchor
   CLI needed.
2. **Swap `appStubClient` → `createRealClient`** per
   [`.planning/builder-a-swap-guide.md`](./.planning/builder-a-swap-guide.md):
   ```ts
   import { createRealClient, riskPolicyIdl, swigDelegationIdl } from "@riskclaw/onchain";
   const client = createRealClient({ connection, wallet, cluster: "devnet", riskPolicyIdl, swigDelegationIdl });
   ```
3. **Wire `/app/audit` to live program events** — replace
   `generateDemoEvents()` with `program.addEventListener("RebalanceExecutedEvent", …)`.
   Pattern shown in `scripts/e2e-smoke.ts` step 3.
4. **Paired devnet test** — Phantom → policy editor → propose →
   multisig auto-exec → observer drift breach → audit page renders the real event.

**DoD:**
- Policy editor submit produces a real `setEncryptedPolicy` tx on devnet.
- `/app/audit` lists at least one real `RebalanceExecutedEvent`.

**Estimated time:** ~2–3 hours net (the swap is mechanical now that IDLs bundle).

## Builder B — next concrete action

**Goal:** Submit. Record demo and click submit.

1. **Preflight before recording** — `bun run seed-demo` (config + wallet
   check + airdrop top-up) then `bun run verify-onchain` (read-only state
   confirm). Both must pass. The live Vercel app is at
   https://riskclaw-sol.vercel.app — open it in incognito + Phantom for a
   clean recording.
3. **Paired devnet test (T-33)** with Builder A once their swap lands —
   Phantom → policy editor → multisig → observer breach → audit page renders
   real `RebalanceExecutedEvent`. THAT is the recording.
4. **Fallback recording** if Builder A's swap slips: `bun run e2e-smoke`
   alone is a working demo. Transcripts at
   [`.planning/builder-b/e2e-transcript-D8-pinned.txt`](./.planning/builder-b/e2e-transcript-D8-pinned.txt)
   prove the 9/9 path against live devnet (real txs `2iNnUdZT…` set,
   `mDg1n47U…` exec).
5. **Submit on colosseum.com/frontier** before deadline.

## Where to read

- [`README.md`](./README.md), [`BUILD_PLAN.md`](./BUILD_PLAN.md),
  [`CLAUDE.md`](./CLAUDE.md) — repo overview, work split, boundary rules
- [`agents/src/onchain-client.ts`](./agents/src/onchain-client.ts) — locked
  integration contract
- [`config/devnet.ts`](./config/devnet.ts) — shared addresses + DEVNET_AGENTS
- [`.planning/builder-a-swap-guide.md`](./.planning/builder-a-swap-guide.md) —
  step-by-step swap instructions (read first if you're Builder A)
- [`.planning/builder-b/T-34-audit.md`](./.planning/builder-b/T-34-audit.md) —
  privacy invariant audit (PASS for v1 scope; v1 placeholder caveat documented)
- [`.planning/builder-b/PRD.md`](./.planning/builder-b/PRD.md) — features,
  API contracts §5, security invariants §9, execution streams §12
- [`.planning/builder-b/STATUS.md`](./.planning/builder-b/STATUS.md) —
  Builder B pipeline state

## How to update this file

End of each session: bump **Last updated**, move shipped items, refresh
"Where we are", flag new blockers. Keep under 150 lines — day-by-day belongs
in [`BUILD_PLAN.md`](./BUILD_PLAN.md).
