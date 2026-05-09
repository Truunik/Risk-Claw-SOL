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

## Status

- [x] Repo + LICENSE + plan docs
- [x] Repo scaffolded (app / agents / programs / encrypted / scripts)
- [x] Phantom wallet connect in operator console
- [x] Policy editor at `/app/policy` (encrypted-threshold draft → stub propose flow)
- [x] Audit trail viewer at `/app/audit` (synthetic events; live wiring pending Builder B program events)
- [x] Helius WS subscribing to one Orca whirlpool — read zone (synthetic metrics; real layout parsing v2)
- [x] Arcium Arcis circuit: `compare(threshold, score)` compiled — compute zone
- [x] Squads V4 dev multisig setup script (`scripts/create-multisig.ts`)
- [ ] `risk_policy` Anchor program: ciphertext pointer + Arcium handle
- [ ] `swig_delegation` bounded execution authority — execute zone
- [ ] Metaplex Core: three agents registered as `mpl-core` NFTs
- [ ] `@riskclaw/onchain` real client (Pkg-15..22) — replaces local stub
- [ ] End-to-end devnet demo: policy → breach → bounded execution
- [ ] Demo video
- [ ] Submission on colosseum.com/frontier
