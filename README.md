# RiskClaw-Sol

**Audit-grade autonomous policy enforcement for institutional onchain capital — with cryptographic guarantees that the policy stays private even from the agents enforcing it.**

RiskClaw-Sol is a Solana risk-ops layer for institutional LP positions. DAO
treasuries and onchain funds delegate bounded rebalancing authority to a
least-privilege three-zone agent stack (read / compute / execute). The user's
risk policy is enforced on-chain without ever existing on-chain — Arcium MPC
compares encrypted thresholds against live position metrics, and the agents
themselves never see plaintext. Execution routes through Vanish to prevent
behavioral inference across firings.

> Built for the Colosseum Frontier hackathon. Started 2026-04-27, submission deadline approximately 2026-05-13.

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

When the policy is breached, the Guardian executes a rebalance through
Vanish, preventing behavioral inference across firings. Every action is
signed by an agent identity registered on the Metaplex 014 registry,
producing a cryptographically auditable trail of which agent did what,
when, and under which delegation.

## Why this matters for institutions

- **Audit-grade.** Every Guardian action is a signed Core NFT transaction
  with a verifiable delegation policy. LPs, boards, and auditors can trace
  any rebalance back to the specific bounded authority that permitted it.
- **Policy privacy.** The threshold itself is the alpha. If it leaks, MEV
  actors front-run firings and competing funds copy the strategy. Encrypted
  thresholds + behavioral-inference-resistant execution close both holes.
- **Least-privilege automation.** No single agent can both decide and act.
  No agent ever holds the policy in plaintext. Compromise of any one zone
  doesn't compromise the policy or the treasury.

## Sponsor integrations

| Sponsor               | Role in RiskClaw-Sol                                                          |
|-----------------------|-------------------------------------------------------------------------------|
| Phantom               | Treasury operator wallet connection (existing wallets, hardware-backed)       |
| Altitude (Squads)     | Multisig approval layer for institutional signers                             |
| Swig                  | Bounded delegation policy — Guardian executes only within signed limits       |
| Helius                | LaserStream gRPC for real-time position monitoring (read zone)                |
| Metaplex              | Three agents registered on the 014 registry as auditable Core NFT identities  |
| Arcium                | Encrypted policy storage + MPC comparison (compute zone never sees plaintext) |
| Vanish                | Private execution path — prevents behavioral inference across firings         |

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
│              │            bounded by Swig delegation                 │
│              ▼            routed through Vanish (private exec)       │
│                                                                      │
│  Each agent registered on Metaplex 014 as a Core NFT — every         │
│  on-chain action is signed by a verifiable agent identity.           │
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
- **Builder B** — Programs + Privacy (Anchor programs, Swig, Arcium, Vanish, Metaplex 014)

Full role breakdown, integration contract, day-by-day plan, and risk callouts
live in [`BUILD_PLAN.md`](./BUILD_PLAN.md). Read that before starting work.

## Status

- [x] Repo + LICENSE + plan docs
- [ ] Repo scaffolded (app / agents / programs / encrypted / scripts)
- [ ] Phantom wallet connect + Squads multisig integration in operator console
- [ ] Helius LaserStream subscribing to one DEX (Orca or Raydium) — read zone
- [ ] Arcium Arcis circuit: encrypted threshold compare — compute zone
- [ ] `risk_policy` Anchor program: ciphertext pointer + Arcium handle
- [ ] `swig_delegation` bounded execution authority — execute zone
- [ ] Metaplex 014: three agents registered as Core NFTs
- [ ] Vanish: private rebalance execution path
- [ ] End-to-end devnet demo: policy → breach → private execution
- [ ] Audit trail viewer (read-only UI for action history)
- [ ] Demo video
- [ ] Submission on arena.colosseum.org
