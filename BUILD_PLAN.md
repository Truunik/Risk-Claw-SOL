# Build Plan

Working doc for the two-builder team. Read this before starting any work, and
keep it updated as scope shifts.

- **Hackathon:** Colosseum Frontier (arena.colosseum.org)
- **Started:** 2026-04-27
- **Deadline:** approximately 2026-05-13 (15 days from start)
- **Repo:** github.com/Truunik/Risk-Claw-SOL (private)
- **Local path (Builder A):** ~/projects/RiskClaw-Sol

## The thesis

RiskClaw-Sol is an autonomous risk guardian for Solana DeFi positions. Users
connect via Phantom, set a private (encrypted) risk threshold, and delegate
bounded execution authority to a Guardian agent. When risk crosses the
threshold, the Guardian rebalances or unwinds — privately — so MEV bots can't
front-run the recovery.

Seven sponsor integrations on one coherent thesis. The differentiator is
**Arcium-encrypted thresholds**: nobody onchain can see when the Guardian will
fire, so nobody can front-run the trigger.

See [`README.md`](./README.md) for the architecture diagram and sponsor table.

## Work split — stack-based

The cleanest API boundary for two builders is **frontend/agents vs.
onchain/privacy**. Each side owns a coherent skill cluster, and they meet at
one well-defined interface (TypeScript clients).

### Builder A — App + Agents

Owns everything the user touches and everything the agent orchestrates. No
Rust, no cryptographic primitives.

- `/app` — Next.js + **Phantom Connect** onboarding (email signin path
  working end-to-end)
- `/app` — User dashboard: positions view, threshold input UI, live status
  indicator, "what's happening right now" feed
- `/agents/observer.ts` — **Helius** LaserStream consumer; subscribes to one
  DEX (Orca or Raydium for v1) and parses position metrics
- `/agents/analyst.ts` — orchestrates the encrypted threshold check
  (calls into Builder B's circuit), scores risk
- `/agents/guardian.ts` — calls Builder B's Anchor programs to execute when
  threshold breached
- **MoonPay Agents** integration (fiat off-ramp on catastrophic exit)
- Demo video + submission narrative on arena.colosseum.org

### Builder B — Programs + Privacy

Owns everything onchain and everything cryptographic. Exposes a clean TS
client to Builder A — no raw RPC calls cross the boundary.

- `/programs/risk_policy` — Anchor program storing the encrypted-threshold
  pointer + execution authority
- `/programs/swig_delegation` — **Swig** delegation policy + bounded
  execution module (the Guardian's hands)
- `/encrypted` — **Arcium** Arcis circuit for encrypted threshold compare
  (MPC-based; never decrypts threshold to plaintext onchain)
- **Vanish** wiring for private execution path on Guardian rebalances
- **Metaplex 014** registration — three agents as Core NFTs with their own
  wallets (Observer / Analyst / Guardian as distinct onchain identities)
- Anchor tests + devnet deploy script

## Integration contract

Lock these TypeScript signatures by **Day 2**. Builder B implements; Builder
A consumes. After Day 2, the signatures are stable — Builder B can change
*implementations* freely, but signature changes require coordination.

```ts
// pkg: @riskclaw/onchain  (Builder B owns, Builder A consumes)

// Set the user's risk threshold (encrypted; Builder B handles ciphertext).
setEncryptedThreshold(
  user: PublicKey,
  ciphertext: Uint8Array
): Promise<TxSig>

// User delegates bounded execution authority to the Guardian agent.
// `policy` describes max position size, allowed instruments, max slippage, etc.
delegateToGuardian(
  user: PublicKey,
  policy: DelegationPolicy
): Promise<TxSig>

// Run the Arcium-encrypted comparison: is current risk > user's threshold?
// Returns score for UX, but never reveals the threshold.
checkThresholdBreach(
  positionId: string
): Promise<{ breached: boolean; score: number }>

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

## Day-by-day plan (risk-ordered)

| Days   | Builder A                                       | Builder B                                       |
|--------|-------------------------------------------------|-------------------------------------------------|
| 1–2    | Phantom Connect + scaffold + threshold UI       | **Arcium first** — hardest sponsor, start here  |
| 3–4    | Helius LaserStream → Observer agent             | RiskPolicyProgram + Swig delegation             |
| 5–6    | Analyst wiring + dashboard polish               | Arcium ↔ Anchor program integration             |
| 7–8    | Guardian orchestration + MoonPay stub           | Metaplex 014 registration                       |
| 9–10   | End-to-end devnet test (paired session)         | End-to-end devnet test (paired session)         |
| 11–12  | MoonPay full integration + demo script         | Vanish private execution wiring                  |
| 13–14  | Demo video + submission narrative               | Polish + bug bash                               |
| 15     | Buffer                                          | Buffer                                          |

Day 7 and Day 12 are **demo-cut milestones** — record a rough demo cut on
those days even if features are incomplete. Real-time visual progress is
the best forcing function we have.

## Risks to call out upfront

1. **Arcium is the trickiest sponsor.** Encrypted compute on Solana is new
   territory. Builder B starts there Day 1, not last. If it stalls by Day 4,
   fall back to a "trusted-execution" stand-in (server-side comparison with
   threshold encrypted at rest only) and ship anyway. Arcium failing should
   not block the demo.

2. **Vanish is a drop-in.** ~200ms added to swap finality, no UX changes,
   no RPC changes. Safe to push to Day 11. Don't do it earlier — it adds
   nothing to early-flow testing.

3. **MoonPay can be stubbed.** Demo doesn't break without it. Builder A
   should not let MoonPay block submission. Stub it as "out of scope for
   v1" if Day 12 arrives without a working integration.

4. **Phantom Connect email flow** has the most user-facing surface area —
   if it's flaky, judges see flaky. Builder A should harden this first.

5. **Helius LaserStream rate limits** — the developer plan covers the demo
   but watch out during stress tests. The 50%-off Frontier offer is
   $24.50/mo if needed.

## Daily standup (15 min, async OK)

Each builder posts:

1. What I shipped yesterday
2. What I'm shipping today
3. What's blocked at the integration boundary
4. Anything cut from scope today

Keep it in a shared doc or DM thread, not GitHub issues — speed > formality.

## Demo storyboard (start drafting Day 7)

Target: 2-minute demo video. Beats:

1. Cold open: "Here's a $10k LP position on Orca."
2. Connect Phantom (email path — no seed phrase shown).
3. Set risk threshold (sliders, no jargon).
4. Threshold encrypts on submit (visual: "encrypted via Arcium").
5. Guardian delegated (visual: Swig policy on a Core NFT mint).
6. Cut to a scripted risk event — pool drains liquidity.
7. Observer detects → Analyst scores → Guardian executes via Vanish.
8. Position rebalanced before the user could have manually reacted.
9. "Front-runners couldn't see this coming. The threshold was encrypted."
10. Sponsor logos + repo link.

Keep it tight. Judges watch hundreds of these.

## Submission checklist (Day 14)

- [ ] All sponsor integrations listed in submission with links to code
- [ ] Demo video uploaded (YouTube unlisted is fine)
- [ ] Repo set to public OR access granted to Colosseum judges
- [ ] arena.colosseum.org submission form completed
- [ ] Squads multisig created for the project (Altitude sponsor — quick win)
- [ ] Sponsor-specific bounty submissions (Vanish $10k, etc.) where applicable
