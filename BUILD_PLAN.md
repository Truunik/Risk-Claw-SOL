# Build Plan

Working doc for the two-builder team. Read this before starting any work, and
keep it updated as scope shifts.

- **Hackathon:** Colosseum Frontier (colosseum.com/frontier)
- **Started:** 2026-04-27
- **Repositioned:** 2026-05-02 (institutional risk-ops thesis; see below)
- **Deadline:** **2026-05-11** (corrected 2026-05-08 from colosseum.com/frontier — was previously stated as 2026-05-13)
- **Repo:** github.com/Truunik/Risk-Claw-SOL (private)
- **Local path (Builder A):** ~/projects/RiskClaw-Sol

## The thesis

RiskClaw-Sol is an institutional risk-ops layer for Solana. DAO treasuries
and onchain funds delegate bounded rebalancing authority to a least-privilege
three-zone agent stack (read / compute / execute). The user's risk policy is
enforced on-chain without ever existing on-chain — Arcium MPC compares
encrypted thresholds against live position metrics, and the agents themselves
never see plaintext.

The pitch: **"audit-grade autonomous policy enforcement for institutional
onchain capital, with cryptographic guarantees that the policy stays private
even from the agents enforcing it."**

This claim is load-bearing. Every code path needs to back it up — no debug
logs, no telemetry that decrypts, no fallback that bypasses Arcium. If we
say "agents never see plaintext," we mean it.

See [`README.md`](./README.md) for the architecture diagram and sponsor table.

## Work split — stack-based

The cleanest API boundary for two builders is **frontend/agents vs.
onchain/privacy**. Each side owns a coherent skill cluster, and they meet at
one well-defined interface (TypeScript clients).

### Builder A — App + Agents

Owns everything the operator touches and everything the agent stack
orchestrates. No Rust, no cryptographic primitives.

- `/app` — Next.js operator console
  - Phantom wallet connection (treasury operator's existing wallet)
  - Squads multisig integration: policy proposals are multisig-gated
  - Policy editor: drawdown, exposure limits, counterparty caps
  - Audit trail viewer: every Guardian action with delegation provenance
- `/agents/observer.ts` — **Helius** LaserStream consumer (read zone)
  - Subscribes to one DEX (Orca or Raydium for v1)
  - Parses position state → `PositionMetrics`
  - Has no signing key, no policy access
- `/agents/analyst.ts` — orchestrates the encrypted comparison (compute zone)
  - Sends ciphertext + metrics to Builder B's Arcium circuit
  - Receives `{ breached, score }` only — never plaintext threshold
- `/agents/guardian.ts` — bounded executor (execute zone)
  - Holds the only signing key
  - Calls Builder B's Swig delegation client to execute
- Demo video + submission narrative on arena.colosseum.org

### Builder B — Programs + Privacy

Owns everything onchain and everything cryptographic. Exposes a clean TS
client to Builder A — no raw RPC calls cross the boundary.

- `/programs/risk_policy` — Anchor program
  - Stores encrypted-threshold ciphertext pointer + Arcium handle
  - Multisig-gated policy updates (interoperates with Squads)
- `/programs/swig_delegation` — Swig bounded delegation
  - Execution authority capped by signed policy
  - Single signing key in the system, owned by Guardian
- `/encrypted` — **Arcium** Arcis circuit
  - MPC comparison: `ciphertext_threshold > computed_risk_score`
  - Output is `{ breached: bool, score: u16 }`; threshold never decrypts
- **Metaplex Core (`mpl-core`)** registration — three agents as Core NFTs
  with their own wallets (Observer / Analyst / Guardian as distinct,
  audit-grade onchain identities, with `zone` Attributes plugin populated)
- Anchor tests + devnet deploy script

## Integration contract

Lock these TypeScript signatures by **2026-05-04 EOD**. Builder B implements;
Builder A consumes. After the lock, signatures are stable — Builder B can
change implementations freely, but signature changes require coordination.

```ts
// pkg: @riskclaw/onchain  (Builder B owns, Builder A consumes)

// Set the institution's encrypted risk policy.
// Caller must be a signer on the Squads multisig that owns this policy.
setEncryptedPolicy(
  multisig: PublicKey,
  ciphertext: Uint8Array
): Promise<TxSig>

// Multisig delegates bounded execution authority to the Guardian agent.
// `policy` describes max position size, allowed instruments, max slippage,
// expiry — enforced onchain by Swig.
delegateToGuardian(
  multisig: PublicKey,
  guardian: PublicKey,
  policy: DelegationPolicy
): Promise<TxSig>

// Run the Arcium-encrypted comparison: is current risk > stored threshold?
// Returns { breached, score }; the threshold itself is never returned.
checkThresholdBreach(
  positionId: string,
  metrics: PositionMetrics
): Promise<ThresholdCheckResult>

// Execute the rebalance and return the tx sig. Routes directly through
// Solana for v1; Vanish v2 is a post-hackathon integration.
executePrivateRebalance(
  plan: RebalancePlan
): Promise<TxSig>

// Register an agent on Metaplex Core; returns the agent's Core NFT mint.
registerAgent(
  agent: AgentConfig
): Promise<MintAddress>
```

Builder A's `/agents` only ever calls these functions. If a real RPC call
shows up in `/agents`, the boundary has leaked — push it back into the client.

Builder A starts against `stubClient` in `agents/src/onchain-client.ts`;
Builder B replaces it with a real implementation when ready.

## Day-by-day plan (calendar-anchored)

> **DEADLINE CORRECTION 2026-05-08:** Frontier deadline is **2026-05-11**, not
> 2026-05-13. Compress the tail: D9 = final demo cut + submit on 2026-05-11.
> D10/D11 below are obsolete — kept only as a record of the original cadence.

10 days from 2026-05-02 to 2026-05-11 deadline. Tight. Every demo cut date
is non-negotiable.

| Date          | Day | Builder A                                     | Builder B                                          |
|---------------|-----|-----------------------------------------------|----------------------------------------------------|
| 2026-05-02 Sat| D0  | Repo scaffold + reposition docs               | Repo scaffold + reposition docs                    |
| 2026-05-03 Sun| D1  | Next.js console + Phantom wallet connect      | **Arcium kickoff** — Arcis env, sample circuit     |
| 2026-05-04 Mon| D2  | Policy editor UI + Squads multisig wiring     | Arcis: encrypted threshold compare circuit         |
| 2026-05-05 Tue| D3  | Helius LaserStream → Observer (one DEX)       | `risk_policy` program: ciphertext storage          |
| 2026-05-06 Wed| D4  | Analyst orchestration + Observer→Analyst wire | `swig_delegation`: bounded exec authority          |
| 2026-05-07 Thu| D5  | Guardian wired to onchain client              | Arcium ↔ `risk_policy` integration                 |
| 2026-05-08 Fri| D6  | **Demo cut #1** (rough end-to-end on stubs)   | Metaplex Core: three-agent registration             |
| 2026-05-09 Sat| D7  | Audit trail viewer + paired devnet test       | Polish + Anchor tests                              |
| 2026-05-10 Sun| D8  | Demo video edit + polish                      | Final polish + bug bash + repo cleanup             |
| 2026-05-11 Mon| D9  | **Demo cut #2 + submit** before deadline      | **Submit** before deadline                         |

D6 (Fri 05-08) is a rough-cut milestone, D9 (Mon 05-11) is the final cut +
submit. Record a demo cut on D6 even if features are incomplete. Real-time
visual progress is the best forcing function we have.

## Risks to call out upfront

1. **Arcium is now load-bearing — the thesis depends on it.** Encrypted
   compute on Solana is new territory, and our pitch claim ("agents never
   see plaintext") collapses if Arcium doesn't work. Builder B starts D1 and
   must have a working circuit by D5. If by D5 it's not running, we have a
   hard decision: either pivot to a TEE/confidential-execution stand-in
   (weaker thesis) or degrade gracefully to an "Arcium-ready architecture"
   pitch where the privacy claim is shown via demo but documented as
   incomplete in v1.

2. **Three-zone separation must be honest.** If we claim least-privilege key
   separation but the agents share a process / share keys / leak data
   through logs, judges who care will catch it. The agents in `/agents/`
   should literally not have the same `Keypair` import paths. Observer
   should crash if handed a signing key.

3. **Squads multisig is new** in this rewrite. For demo, a 1-of-1 or
   2-of-2 dev multisig is fine. Don't try to integrate full
   institutional-grade signer flows in 10 days; show the architecture and
   one working policy-update path through the multisig.

4. **Helius LaserStream rate limits** — developer plan covers the demo,
   but watch out during stress tests. The 50%-off Frontier offer is
   $24.50/mo if needed.

5. **Hardware wallet path optional.** Phantom-with-Ledger is institutional
   gold but adds testing surface. Out of scope for v1; mention in the
   submission as a v2 path.

## Daily standup (15 min, async OK)

Each builder posts:

1. What I shipped yesterday
2. What I'm shipping today
3. What's blocked at the integration boundary
4. Anything cut from scope today

Keep it in a shared doc or DM thread, not GitHub issues — speed > formality.

## Demo storyboard (2 min, target shoot 2026-05-10)

Institutional narrative is harder to make visceral than consumer-rescue.
Solve this with **time-pressure framing**: a treasury manager away from
their desk while the market moves.

1. **Cold open (0:00–0:15).** Wide shot of a "DAO treasury dashboard" —
   $2M in LP positions on Orca. One-line voiceover: "This treasury sleeps
   tonight. The policy doesn't."
2. **Setup (0:15–0:35).** Operator opens the console, defines a policy via
   sliders. On submit, visual: ciphertext rendered, label "encrypted via
   Arcium MPC — even our agents can't read this."
3. **Delegation (0:35–0:50).** Squads multisig approves. Visual: three
   Core-NFT agent identities mint on Metaplex. Each shows its zone:
   "READ", "COMPUTE", "EXECUTE".
4. **Risk event (0:50–1:20).** Cut to a scripted onchain event — pool
   liquidity drops 40%. Observer's metrics light up. Analyst calls into
   Arcium. "Threshold check: encrypted in, encrypted out." Result:
   `breached = true`.
5. **Bounded execution (1:20–1:45).** Guardian executes via Swig delegation.
   Show the rebalance tx with the slippage gate firing onchain: "Bounded by
   policy — the Guardian's keypair could not exceed this if it tried.
   Behavioral inference resistance via Vanish v2 is on the post-hackathon
   roadmap." Position recovered.
6. **Audit trail (1:45–2:00).** Cut to the audit viewer: every action
   signed by an agent's Core NFT, every delegation traceable. Voiceover:
   "Audit-grade automation. The policy stayed private. Even from the
   agents enforcing it." Sponsor logos + repo link.

Keep it tight. Judges watch hundreds of these.

## Submission checklist (2026-05-10)

- [ ] All sponsor integrations listed in submission with links to code
- [ ] Squads multisig created for the project (Altitude/Squads sponsor)
- [ ] Demo video uploaded (YouTube unlisted is fine)
- [ ] Repo set to public OR access granted to Colosseum judges
- [ ] colosseum.com/frontier submission form completed
- [ ] Sponsor-track submissions filed (verified Frontier supporters only —
      Altitude · Phantom · Arcium · Raydium · Coinbase · World · MoonPay ·
      Metaplex · Privy · Reflect · Superteam):
  - [ ] Phantom Connect track (`/app` operator wallet)
  - [ ] Altitude / Squads V4 (multisig-gated policy at `risk_policy::update_policy`)
  - [ ] Arcium request-for-product (encrypted DeFi primitive — `threshold_compare`)
  - [ ] Metaplex Core agent identity track (`scripts/register-agents.ts`)
- [ ] README claims match code (every "agents never see plaintext" claim
  must hold against a code review)
