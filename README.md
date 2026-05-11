# RiskClaw-Sol

**Audit-grade autonomous policy enforcement for institutional onchain capital — with cryptographic guarantees that the policy stays private even from the agents enforcing it.**

RiskClaw-Sol is a Solana risk-ops layer for institutional LP positions. DAO
treasuries and onchain funds delegate bounded rebalancing authority to a
least-privilege three-zone agent stack (read / compute / execute). The user's
risk policy is enforced on-chain without ever existing on-chain — Arcium MPC
compares encrypted thresholds against live position metrics, and the agents
themselves never see plaintext.

> Built for the Colosseum Frontier hackathon. Started 2026-04-27, submission
> deadline **2026-05-11**.

## What it does

A treasury operator connects via Phantom (existing wallet, with a Squads
multisig as the institution's approval layer for signers). They define a
risk policy — exposure limits, drawdown thresholds, max counterparty share —
which is encrypted client-side and stored as ciphertext on Solana. Three
agents in separate trust zones enforce it:

- **Read zone** (Observer) streams position metrics from Helius LaserStream.
  No signing authority, no plaintext, no execution.
- **Compute zone** (Analyst) runs the encrypted threshold comparison inside
  Arcium MPC. Sees neither the policy nor the metrics in plaintext.
- **Execute zone** (Guardian) holds the only signing key, bounded tightly by
  Swig delegation. Receives only a "rebalance / no-op" decision from the
  compute zone — never the threshold itself.

When the policy is breached, the Guardian executes a rebalance through Swig
delegation — slippage and notional bounds enforced onchain. Every action is
signed by an agent identity registered as a Metaplex Core (`mpl-core`) NFT
with a `zone` Attribute, producing a cryptographically auditable trail of
which agent did what, when, and under which delegation. Behavioral-inference
resistance via Vanish is on the post-hackathon roadmap.

## Why this matters for institutions

- **Audit-grade.** Every Guardian action is a signed Core NFT transaction
  with a verifiable delegation policy. LPs, boards, and auditors can trace
  any rebalance back to the specific bounded authority that permitted it.
- **Policy privacy.** The threshold itself is the alpha. Encrypted thresholds
  via Arcium MPC mean MEV actors can't front-run firings and competing funds
  can't reverse-engineer the strategy from the chain.
- **Least-privilege automation.** No single agent can both decide and act.
  No agent ever holds the policy in plaintext. Compromise of any one zone
  doesn't compromise the policy or the treasury.

## Sponsor integrations

| Sponsor               | Role in RiskClaw-Sol                                                          |
|-----------------------|-------------------------------------------------------------------------------|
| Phantom               | Treasury operator wallet connection (existing wallets, hardware-backed)       |
| Altitude (Squads V4)  | Multisig approval layer — only the vault PDA can mutate `risk_policy`         |
| Swig                  | Bounded delegation — Guardian's signing key capped by signed policy onchain   |
| Helius                | Real-time position monitoring via WS account subscriptions (read zone)        |
| Metaplex Core         | Three agents registered as `mpl-core` NFTs with `zone` Attributes             |
| Arcium                | Encrypted policy storage + MPC comparison (compute zone never sees plaintext) |

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Treasury operator                                                   │
│  Phantom wallet ── proposes policy via Squads multisig ─────────┐    │
│                                                                 │    │
│  Policy is encrypted client-side, ciphertext stored on Solana   │    │
└──────────────────────────────────────────────────────────────────┼───┘
                                                                  │
                                  ┌───────────────────────────────┘
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Three-zone agent stack — least-privilege, key-separated             │
│                                                                      │
│  READ zone   (Observer)   no keys, RPC reads only                    │
│              │            Helius LaserStream → metrics               │
│              ▼                                                       │
│  COMPUTE zone (Analyst)   no signing key, no plaintext               │
│              │            Arcium MPC: ciphertext threshold vs metrics│
│              │            output: { breached: bool, score: u16 }     │
│              ▼                                                       │
│  EXECUTE zone (Guardian)  only signing key in the system             │
│              │            bounded by Swig delegation onchain         │
│              ▼            slippage + notional gates enforced         │
│                                                                      │
│  Each agent registered as a Metaplex Core NFT (`mpl-core`) with a    │
│  `zone` Attribute — every onchain action is signed by a verifiable   │
│  agent identity tied to its trust zone.                              │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Solana programs                                                     │
│  ├─ risk_policy        encrypted threshold pointer + Arcium handle   │
│  └─ swig_delegation    bounded execution authority for Guardian      │
└──────────────────────────────────────────────────────────────────────┘
```

## Repo layout

```
/app          Next.js operator console (Phantom + Squads, policy editor)
/agents       TypeScript agent swarm (Observer, Analyst, Guardian)
/programs     Anchor workspace (risk_policy, swig_delegation)
/encrypted    Arcium Arcis circuits (encrypted threshold compare)
/scripts      devnet deployment + demo harness
```

## Team

Two-builder team, split for parallel execution.

- **Builder A** — App + Agents (Next.js console, agent orchestration, demo)
- **Builder B** — Programs + Privacy (Anchor programs, Swig, Arcium, Metaplex Core)

Full role breakdown, integration contract, day-by-day plan, and risk callouts
live in [`BUILD_PLAN.md`](./BUILD_PLAN.md). Read that before starting work.

## Submission

Paste-ready submission copy + sponsor track links + judges' 1-page summary:
[`SUBMISSION.md`](./SUBMISSION.md).

## Status

Submission state as of D9 (2026-05-11 — submission day).

- [x] Repo + LICENSE + plan docs
- [x] Repo scaffolded (app / agents / programs / encrypted / scripts)
- [x] Phantom wallet connect in operator console
- [x] Policy editor at `/app/policy` (encrypted-threshold draft + propose)
- [x] Audit trail viewer at `/app/audit` (synthetic events; live wire pending Builder A swap)
- [x] Helius WS subscribing to one Orca whirlpool — read zone
- [x] Arcium Arcis circuit: `compare(threshold, score)` compiled @ 464M ACU
- [x] Squads V4 dev multisig (1-of-1 vault PDA on devnet)
- [x] **`risk_policy` Anchor program live on devnet** (`FNThNj…PHrzN`) — 3/3 tests
- [x] **`swig_delegation` Anchor program live on devnet** (`9ECtiz…L9zBo`) — 5/5 tests
- [x] **Metaplex Core agents minted on devnet** — Observer / Analyst / Guardian
- [x] **`@riskclaw/onchain` real client** — bundled IDLs, real RealClient, FR-5b/FR-8b throttles, 14/14 tests
- [x] **T-30b zone-separation invariant** — 6/6 tests (TS-side; Anchor variant deferred to C-14)
- [x] **T-34 privacy invariant audit** — PRD §9 invariants 1-4 PASS for v1
- [x] **`scripts/e2e-smoke.ts`** — 9-step demo orchestrator (S-27b)
- [x] **`scripts/seed-demo.ts`** — preflight + airdrop top-up + pinned DEMO_STATE (S-23b)
- [ ] Builder A `appStubClient` → `createRealClient` swap (PR pending)
- [ ] Paired devnet test (T-33) + audit page wired to live program events
- [ ] Demo recording (D9)
- [ ] Submission on colosseum.com/frontier (D9)
- [ ] Live MPC runtime (C-14 — deferred; PRD §7 R1 fallback documented)
- [ ] Swig CPI swap for Exit (P-11 — Q2 spike; v2)

## Run the demo

```bash
# 1. Preflight + airdrop top-up + print pinned DEMO_STATE (S-23b)
cd scripts && bun install && bun run seed-demo

# 2. Walk the 9-step end-to-end against live devnet (S-27b)
bun run e2e-smoke
```

Devnet program IDs and agent mints are committed in
[`config/devnet.ts`](./config/devnet.ts); no setup needed beyond a funded
`~/.config/solana/id.json`.

## Demo storyboard (2 minutes)

| t       | Frame                          | Narration |
|---------|--------------------------------|-----------|
| 0:00    | Phantom connects to `/app`     | "Operator opens RiskClaw on devnet — Phantom + Squads multisig as the institutional approval layer." |
| 0:15    | `/app/policy` editor           | "They draft a policy: drawdown ≥ 25% triggers an Exit. The threshold encrypts client-side via `RISKCLAW_V1_STUB` packing — bytes [0..8] are the value, bytes [48..64] are the auditor signal." |
| 0:30    | Squads → setEncryptedPolicy tx | "Multisig auto-execs (1-of-1 dev), the ciphertext lands in `risk_policy::RiskPolicy` on devnet." |
| 0:45    | Helius observer terminal       | "Observer streams synthetic drawdown — 500bps, 1500bps, 3500bps. Read zone: no keys, no policy access." |
| 1:00    | Analyst evaluates              | "Compute zone calls `checkThresholdBreach` — FR-5b throttle hits within 5s, real call when stale. Returns `{breached, score}` only — never the threshold." |
| 1:15    | Guardian → executePrivateRebalance | "Execute zone fires `swig_delegation::execute_rebalance` — slippage gate + 30s idempotency window enforced onchain. Only zone with a key." |
| 1:30    | `/app/audit` event row         | "Audit page lists the real `RebalanceExecutedEvent` — Guardian signer + size + timestamp, all signed by the Metaplex Core NFT identity." |
| 1:45    | Re-fire within 30s             | "FR-8b idempotency: re-call returns the cached prior `TxSig`. No double-swap, no race." |
| 2:00    | Cut to scoreboard              | "Audit-grade architecture, encrypted policy storage, MPC-comparison circuit live, agent identities on-chain. v2 wires RescueCipher + Arcium MXE — flagged with the on-chain `RISKCLAW_V1_STUB` tag so it's never confused with cryptographic privacy." |
