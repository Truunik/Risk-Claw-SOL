# Build Plan

Working doc for the two-builder team. Read this before starting any work, and
keep it updated as scope shifts.

- **Hackathon:** Colosseum Frontier (arena.colosseum.org)
- **Started:** 2026-04-27
- **Repositioned:** 2026-05-02 (institutional risk-ops thesis; see below)
- **Deadline:** approximately 2026-05-13
- **Repo:** github.com/Truunik/Risk-Claw-SOL (private)
- **Local path (Builder A):** ~/projects/RiskClaw-Sol

## The thesis

RiskClaw-Sol is an institutional risk-ops layer for Solana. DAO treasuries
and onchain funds delegate bounded rebalancing authority to a least-privilege
three-zone agent stack (read / compute / execute). The user's risk policy is
enforced on-chain without ever existing on-chain — Arcium MPC compares
encrypted thresholds against live position metrics, and the agents themselves
never see plaintext. Execution routes through Vanish to prevent behavioral
inference across firings.

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
- **Vanish** wiring for private execution path on Guardian rebalances
- **Metaplex 014** registration — three agents as Core NFTs with their own
  wallets (Observer / Analyst / Guardian as distinct, audit-grade onchain
  identities)
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

// Execute the rebalance through Vanish; returns the (private) tx sig.
executePrivateRebalance(
  plan: RebalancePlan
): Promise<TxSig>

// Register an agent on Metaplex 014; returns the agent's Core NFT mint.
registerAgent(
  agent: AgentConfig
): Promise<MintAddress>
```

Builder A's `/agents` only ever calls these functions. If a real RPC call
shows up in `/agents`, the boundary has leaked — push it back into the client.

Builder A starts against `stubClient` in `agents/src/onchain-client.ts`;
Builder B replaces it with a real implementation when ready.

## Day-by-day plan (calendar-anchored)

11 days from 2026-05-02 to 2026-05-13 deadline. Tight. Every demo cut date
is non-negotiable.

| Date          | Day | Builder A                                     | Builder B                                          |
|---------------|-----|-----------------------------------------------|----------------------------------------------------|
| 2026-05-02 Sat| D0  | Repo scaffold + reposition docs               | Repo scaffold + reposition docs                    |
| 2026-05-03 Sun| D1  | Next.js console + Phantom wallet connect      | **Arcium kickoff** — Arcis env, sample circuit     |
| 2026-05-04 Mon| D2  | Policy editor UI + Squads multisig wiring     | Arcis: encrypted threshold compare circuit         |
| 2026-05-05 Tue| D3  | Helius LaserStream → Observer (one DEX)       | `risk_policy` program: ciphertext storage          |
| 2026-05-06 Wed| D4  | Analyst orchestration + Observer→Analyst wire | `swig_delegation`: bounded exec authority          |
| 2026-05-07 Thu| D5  | Guardian wired to onchain client              | Arcium ↔ `risk_policy` integration                 |
| 2026-05-08 Fri| D6  | **Demo cut #1** (rough end-to-end on stubs)   | Metaplex 014: three-agent registration             |
| 2026-05-09 Sat| D7  | Audit trail viewer + paired devnet test       | Vanish wiring for Guardian execution               |
| 2026-05-10 Sun| D8  | Polish + edge cases + paired devnet test      | Polish + Anchor tests + paired devnet test         |
| 2026-05-11 Mon| D9  | **Demo cut #2** (final, on real onchain)      | Final polish + bug bash                            |
| 2026-05-12 Tue| D10 | Demo video edit + sponsor bounty submissions  | Submission packaging + repo cleanup                |
| 2026-05-13 Wed| D11 | **Submit** before deadline                    | **Submit** before deadline                         |

D6 (Fri 05-08) and D9 (Mon 05-11) are demo-cut milestones — record a rough
demo cut on those days even if features are incomplete. Real-time visual
progress is the best forcing function we have.

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

3. **Vanish is a drop-in.** ~200ms added to swap finality, no UX changes,
   no RPC changes. Safe to push to D7. Don't do it earlier — adds nothing
   to early-flow testing.

4. **Squads multisig is new** in this rewrite. For demo, a 1-of-1 or
   2-of-2 dev multisig is fine. Don't try to integrate full
   institutional-grade signer flows in 11 days; show the architecture and
   one working policy-update path through the multisig.

5. **Helius LaserStream rate limits** — developer plan covers the demo,
   but watch out during stress tests. The 50%-off Frontier offer is
   $24.50/mo if needed.

6. **Hardware wallet path optional.** Phantom-with-Ledger is institutional
   gold but adds testing surface. Out of scope for v1; mention in the
   submission as a v2 path.

## Daily standup (15 min, async OK)

Each builder posts:

1. What I shipped yesterday
2. What I'm shipping today
3. What's blocked at the integration boundary
4. Anything cut from scope today

Keep it in a shared doc or DM thread, not GitHub issues — speed > formality.

## Demo storyboard (2 min, target shoot 2026-05-11)

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
5. **Private execution (1:20–1:45).** Guardian executes via Vanish. Show
   the rebalance tx — but obscured: "Routed through Vanish. Behavioral
   inference impossible across firings." Position recovered.
6. **Audit trail (1:45–2:00).** Cut to the audit viewer: every action
   signed by an agent's Core NFT, every delegation traceable. Voiceover:
   "Audit-grade automation. The policy stayed private. Even from the
   agents enforcing it." Sponsor logos + repo link.

Keep it tight. Judges watch hundreds of these.

## Submission checklist (2026-05-12)

- [ ] All sponsor integrations listed in submission with links to code
- [ ] Squads multisig created for the project (Altitude/Squads sponsor)
- [ ] Demo video uploaded (YouTube unlisted is fine)
- [ ] Repo set to public OR access granted to Colosseum judges
- [ ] arena.colosseum.org submission form completed
- [ ] Sponsor-specific bounty submissions filed:
  - [ ] Vanish $10k integration bounty
  - [ ] Arcium request-for-product (encrypted DeFi primitive)
  - [ ] Phantom Connect track
  - [ ] Helius developer track
  - [ ] Swig agentic-DeFi track
  - [ ] Metaplex 014 agent registry track
- [ ] README claims match code (every "agents never see plaintext" claim
  must hold against a code review)
