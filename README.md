# RiskClaw-Sol

**An autonomous risk guardian for Solana DeFi positions.**

RiskClaw-Sol watches a user's Solana DeFi positions in real time. When risk
crosses a user-defined threshold, an agent swarm acts on the user's behalf —
unwinding, rebalancing, or liquidating to safety — without ever exposing the
user's strategy onchain.

> Built for the Colosseum Frontier hackathon (April 2026).

## What it does

A user connects via Phantom Connect, sets a **private** risk tolerance
(encrypted with Arcium), and delegates bounded execution authority to a
Guardian smart wallet (Swig). A three-agent swarm — Observer, Analyst,
Guardian — watches their positions via Helius LaserStream. When risk crosses
the encrypted threshold, the Guardian executes the rebalance through Vanish so
MEV bots can't front-run the recovery. If the user opts in, MoonPay handles
the fiat off-ramp on catastrophic exit.

```
GREEN   healthy position           agent watches
YELLOW  risk approaching limit     agent prepares rebalance plan
RED     threshold breached         Guardian executes via Swig + Vanish
EXIT    catastrophic               MoonPay off-ramp (if user opted in)
```

## Sponsor integrations

| Sponsor    | Role in RiskClaw-Sol                                                  |
|------------|-----------------------------------------------------------------------|
| Phantom    | Embedded wallet onboarding (Connect) + web2 email signin              |
| Swig       | Programmable delegation policy — Guardian executes within user limits |
| Helius     | LaserStream gRPC for real-time pool + position monitoring             |
| Metaplex   | Three guardian agents registered on the 014 registry as Core NFTs     |
| Arcium     | Encrypted user thresholds + positions — strategies stay private       |
| Vanish     | Private execution path for Guardian rebalances                        |
| MoonPay    | Agent fiat off-ramp when liquidating to safety                        |

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  User (Phantom Connect — email or existing Phantom)                  │
│  └─ sets encrypted threshold via Arcium                              │
│  └─ delegates bounded execution to Guardian via Swig                 │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Agent Swarm (each agent registered on Metaplex 014 as a Core NFT)   │
│                                                                      │
│  Observer  ─ Helius LaserStream → position metrics                   │
│  Analyst   ─ scores risk vs encrypted threshold (Arcium MPC)         │
│  Guardian  ─ executes via Swig delegation, routed through Vanish     │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Solana Programs                                                     │
│  ├─ RiskPolicyProgram     encrypted threshold + exec authority       │
│  ├─ Swig delegation       bounded execution policy                   │
│  └─ MoonPay agent         optional fiat exit on catastrophic risk    │
└──────────────────────────────────────────────────────────────────────┘
```

## Why this can win

- **Sponsor stack density** — seven sponsor integrations on one coherent
  thesis, not bolted on.
- **Real privacy primitive** — encrypted thresholds via Arcium mean MEV bots
  literally cannot see when a Guardian will fire. This isn't a swap-privacy
  bolt-on; it's privacy as a *protective* feature.
- **Agent identity that pays** — three agents with their own Metaplex 014
  Core-NFT wallets, executing real value-protective actions, not toy
  agent-to-agent demos.
- **Phantom-native UX** — email signin via Phantom Connect, no seed phrases,
  no extension-only friction.

## Repo layout

```
/app          Next.js frontend (Phantom Connect, dashboard)
/agents       TypeScript agent swarm (Observer, Analyst, Guardian)
/programs     Anchor workspace (Solana programs)
/encrypted    Arcium Arcis circuits (encrypted threshold compare)
/scripts      devnet deployment + demo harness
```

## Team

Two-builder team, split for parallel execution. See **Work split** below.

## Status

- [ ] Repo scaffolded (app / agents / programs / encrypted)
- [ ] Phantom Connect integrated (frontend wallet flow)
- [ ] Helius LaserStream subscribing to one DEX (Orca or Raydium)
- [ ] Swig delegation: user → Guardian wallet, bounded policy
- [ ] Anchor: RiskPolicyProgram with encrypted-threshold pointer
- [ ] Arcium: encrypted threshold + comparison circuit
- [ ] Agent swarm: Observer → Analyst → Guardian end-to-end on devnet
- [ ] Metaplex 014: three agents registered as Core NFTs
- [ ] Vanish: private rebalance execution
- [ ] MoonPay: agent fiat off-ramp
- [ ] Demo video
- [ ] Submission on arena.colosseum.org
