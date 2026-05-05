# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

RiskClaw-Sol is a **Colosseum Frontier hackathon** submission. Started 2026-04-27,
deadline ~2026-05-13. Optimize for shipping a working demo by the deadline over
architectural purity.

**Current thesis (repositioned 2026-05-02):** *audit-grade autonomous policy
enforcement for institutional onchain capital, with cryptographic guarantees
that the policy stays private even from the agents enforcing it.* This pitch is
load-bearing — every code path must back it up. No debug logs that decrypt, no
telemetry that leaks the threshold, no fallback that bypasses Arcium without
documenting the regression. If the README says *"agents never see plaintext,"*
we mean it.

Read [`README.md`](./README.md) for the architecture diagram and
[`BUILD_PLAN.md`](./BUILD_PLAN.md) for the calendar-anchored day-by-day plan and
risk callouts. Both are load-bearing — when scope or schedule shifts, update them.

## Repo state (as of 2026-05-05)

Scaffold landed in commit `8d2cca3` on 2026-05-02. Status:

```
/app          ❌ README only — Builder A scaffolds Next.js (D1, overdue)
/agents       ✅ Bun + TypeScript skeleton, three-zone separation, typecheck passes
/programs     ❌ README only — Builder B runs `anchor init` (D1, overdue)
/encrypted    ❌ README only — Builder B runs Arcis setup (D1, overdue)
/scripts      ❌ README only — shared, populated as deploys land
```

Toolchain established by the scaffold: **bun** (workspace package manager —
note `agents/bun.lock`), **TypeScript** for `/agents` and `/app`, **Anchor**
(Rust) for `/programs`, **Arcis** (Arcium's Rust framework) for `/encrypted`.
Don't switch package managers without coordinating.

## The work split — do not cross the boundary

Two builders, split by stack. **Always know which side you are editing**, because
the boundary between them is also the integration contract.

- **Builder A — App + Agents** (`/app`, `/agents`): Next.js operator console,
  Phantom wallet connect, Squads multisig integration, Helius LaserStream.
  No Rust, no cryptographic primitives.
- **Builder B — Programs + Privacy** (`/programs`, `/encrypted`,
  `@riskclaw/onchain`): Anchor programs, Swig delegation, Arcium Arcis circuit,
  Vanish wiring, Metaplex 014 agent registration. Exposes a clean TypeScript
  client to Builder A.

**The hard rule:** Builder A's `/agents` and `/app` code calls Builder B's
`@riskclaw/onchain` package and **never opens its own `Connection`, calls
`sendTransaction`, or holds a signing `Keypair`**. Type-only imports of
`PublicKey` from `@solana/web3.js` are fine (the shared types use it). If you
find yourself constructing transactions or RPC requests inside `/agents` or
`/app`, the boundary has leaked — push the call into `@riskclaw/onchain`.

**Zone separation inside `/agents` is also load-bearing.** Files are tagged
`// READ ZONE`, `// COMPUTE ZONE`, `// EXECUTE ZONE` in their headers. Only
the EXECUTE zone (`guardian.ts`) may sign. If you import a `Keypair` into
`observer.ts` or `analyst.ts`, the project's privacy claim collapses.

## Integration contract (locked in code)

The boundary surface is the `OnchainClient` interface at
[`agents/src/onchain-client.ts`](./agents/src/onchain-client.ts) with shared
types in [`agents/src/types.ts`](./agents/src/types.ts). Builder B implements
this and ships `@riskclaw/onchain`; Builder A consumes via that package.

```ts
setEncryptedPolicy(multisig: PublicKey, ciphertext: Uint8Array): Promise<TxSig>
delegateToGuardian(multisig: PublicKey, guardian: PublicKey, policy: DelegationPolicy): Promise<TxSig>
checkThresholdBreach(positionId: string, metrics: PositionMetrics): Promise<ThresholdCheckResult>
executePrivateRebalance(plan: RebalancePlan): Promise<TxSig>
registerAgent(agent: AgentConfig): Promise<MintAddress>
```

Notable shape rules:
- `multisig` first arg = Squads multisig PDA (institutional approval layer).
- `metrics` is passed to `checkThresholdBreach` (Analyst pre-computes from Observer).
- `RebalancePlan.action ∈ {"REDUCE","EXIT","HEDGE"}` — Swig delegation must
  support whatever subset v1 implements.
- `AgentConfig.zone ∈ {"read","compute","execute"}` — three Metaplex 014
  Core NFTs total, one per zone.

If a feature needs a new capability across the boundary, **add a new function** —
don't overload an existing signature. Signature changes require coordination
between both builders.

**`ThresholdCheckResult.score` privacy invariant** ⚠️ — `score` must be
derivable purely from public position metrics. It MUST NOT be any function of
the encrypted threshold. If the score leaks even one bit about the threshold,
the privacy claim is broken. Document and assert this in the Arcis circuit.

## Risk-ordered priorities (from BUILD_PLAN)

When making scope decisions, weight in this order:

1. **Arcium is the thesis.** Per the reposition, the privacy claim depends on
   Arcium working. **D5 (2026-05-07) is the kill-switch decision date** — if
   the Arcis circuit is not running by D5, the team must commit to a graceful
   degradation pitch (TEE stand-in or "Arcium-ready architecture, demo-only")
   rather than ship a silent fallback. Document any caveat explicitly.
2. **Three-zone separation must be honest.** If `/agents` shares keys, shares
   processes, or leaks plaintext through logs, judges who care will catch it.
   Observer must crash if handed a signing key.
3. **Vanish is a drop-in.** ~200ms added to swap finality, no UX change. Push
   to D7 (2026-05-09); adds nothing to early-flow testing.
4. **Squads multisig is new in this rewrite.** A 1-of-1 or 2-of-2 dev multisig
   is fine for demo. Don't try to build full institutional signer flows in 11
   days — show the architecture, ship one working policy-update path.

## Sponsor integration map

Each sponsor is tied to a specific module. Don't introduce a sponsor in a place
it doesn't belong "for completeness" — the submission narrative is sharper when
each sponsor solves one well-defined problem.

| Sponsor           | Lives in                                          | Owned by  |
|-------------------|---------------------------------------------------|-----------|
| Phantom           | `/app` (operator wallet connect)                  | Builder A |
| Altitude (Squads) | `/app` (multisig UX) + `/programs/risk_policy`    | shared    |
| Helius            | `/agents/observer.ts`                             | Builder A |
| Swig              | `/programs/swig_delegation`                       | Builder B |
| Arcium            | `/encrypted` + `/programs/risk_policy`            | Builder B |
| Vanish            | `executePrivateRebalance` in `@riskclaw/onchain`  | Builder B |
| Metaplex 014      | `/scripts/register-agents.ts` + onchain registry  | Builder B |

(MoonPay was dropped in the 2026-05-02 reposition — fiat off-ramp didn't fit
the institutional positioning.)

## Build / dev / test commands

Working today (post-scaffold):

```bash
# /agents
cd agents
bun install
cp .env.example .env       # set HELIUS_API_KEY
bun run typecheck          # tsc --noEmit
bun run dev                # bun run src/run.ts (will fail without env)
```

Pending Builder B's scaffold work (per `programs/README.md` and
`encrypted/README.md`):

```bash
# /programs (after `anchor init . --no-git`)
cd programs
anchor build
anchor test

# /encrypted (after `cargo new --lib threshold_compare`)
cd encrypted/threshold_compare
cargo build
# Arcis-specific build commands per https://docs.arcium.com
```

Pending Builder A's scaffold (per `app/README.md`):

```bash
cd app
# npx create-next-app@latest . --typescript --app --tailwind --no-src --import-alias "@/*"
bun run dev
```

When you add a new package or workspace, **update this section**.

## Working style for this repo

- **Calendar-anchored milestones.** D0=2026-05-02 (scaffold) ... D11=2026-05-13
  (submit). **D6 (2026-05-08) and D9 (2026-05-11) are demo-cut days** — record
  a rough demo even if features are incomplete. Visual progress is the best
  forcing function we have.
- **D5 (2026-05-07) Arcium kill-switch.** If the encrypted circuit isn't
  running, commit to the degradation pitch — don't gamble further.
- **Daily async standup** in a shared doc/DM (per BUILD_PLAN). Not GitHub issues.
- **Devnet only** for the entire build. There is no mainnet path in scope.
- **Update the README status checklist** as items land — it's the public face
  of progress and the demo script anchor.
- **Conventional commits, no AI signatures** — see global rules in
  `~/.claude/CLAUDE.md`. Branch: `builder-{a|b}/<scope>`.

## Source-of-truth docs

- [`README.md`](./README.md) — pitch, architecture diagram, sponsor table, status checklist
- [`BUILD_PLAN.md`](./BUILD_PLAN.md) — work split, integration contract,
  calendar-anchored day-by-day plan, risk callouts, demo storyboard, submission checklist
- [`agents/src/onchain-client.ts`](./agents/src/onchain-client.ts) — the live
  integration contract (interface + stub)
- [`agents/src/types.ts`](./agents/src/types.ts) — shared cross-boundary types

When these and CLAUDE.md disagree, **the source-of-truth docs win** — update
CLAUDE.md to match.
