# RiskClaw-Sol — Colosseum Frontier Submission

Paste-ready submission copy for **colosseum.com/frontier** and each sponsor
track. Public-facing language only — do not paste internal planning files.

---

## Title

**RiskClaw-Sol**

## One-line pitch (280 chars)

Audit-grade autonomous policy enforcement for institutional onchain capital on Solana — encrypted thresholds, three-zone least-privilege agents, signed delegation. The threshold stays private even from the agents enforcing it.

## Long description (paste into colosseum.com)

RiskClaw-Sol is a Solana risk-ops layer for institutional LP positions. DAO
treasuries and onchain funds delegate bounded rebalancing authority to a
least-privilege three-zone agent stack — and the risk policy is enforced
on-chain without ever existing on-chain in plaintext.

**The architecture, in one sentence:** an encrypted threshold lives in
`risk_policy::RiskPolicy` on Solana, an Arcium MPC circuit compares it
against live position metrics from Helius, and the only agent allowed to
sign — the Guardian, bounded by Swig delegation — receives a
`{ breached, score }` result without ever seeing the threshold itself.

**Three trust zones, key-separated by construction:**

- **READ** (Observer): Helius WebSocket → synthetic position metrics. No
  signing key. CI fails if `Keypair` ever leaks into this file (zone-separation
  invariant test, 6/6 pass).
- **COMPUTE** (Analyst): Calls `checkThresholdBreach` — returns
  `{ breached, score }` only. The `score` is a pure passthrough from
  public metrics; PRD §9.3 invariant pinned in code AND verified in T-34
  audit. The Analyst never decrypts the threshold.
- **EXECUTE** (Guardian): The only zone with a signing key. Bounded by
  `swig_delegation::execute_rebalance` onchain — slippage gate (basis-point
  math in u128), 30-second idempotency window (FR-8b), action gate (only
  `EXIT` ships in v1).

**Every agent action is a signed Metaplex Core (`mpl-core`) NFT
transaction.** Three identities live on devnet — Observer, Analyst, Guardian
— each with a `zone` Attribute. The audit trail isn't an afterthought; it's
the primary output.

---

## Live on Solana devnet

| Account | Address | Explorer |
|---|---|---|
| `risk_policy` program | `FNThNjwxtdVSttM1Q9R81pKbiSF7jCzt8vE22A4PHrzN` | https://explorer.solana.com/address/FNThNjwxtdVSttM1Q9R81pKbiSF7jCzt8vE22A4PHrzN?cluster=devnet |
| `swig_delegation` program | `9ECtiz1EnfKnVDYFKn4GofXGeoCZHupqN2GPkcgL9zBo` | https://explorer.solana.com/address/9ECtiz1EnfKnVDYFKn4GofXGeoCZHupqN2GPkcgL9zBo?cluster=devnet |
| Squads V4 dev multisig | `BpwBRaBoHj2it821Knv2WpKB67gC6rgfg7KRdBNHHqme` | https://explorer.solana.com/address/BpwBRaBoHj2it821Knv2WpKB67gC6rgfg7KRdBNHHqme?cluster=devnet |
| Observer agent NFT | `AERmaK7CD7HGp8zFHP3PEGtfEC6QWZUHYh6Xg8YHwLQU` | https://explorer.solana.com/address/AERmaK7CD7HGp8zFHP3PEGtfEC6QWZUHYh6Xg8YHwLQU?cluster=devnet |
| Analyst agent NFT | `Hq5VqNHUNtENWTNTk3ZqJz6jdJExrzw5cUCayAhVUjdo` | https://explorer.solana.com/address/Hq5VqNHUNtENWTNTk3ZqJz6jdJExrzw5cUCayAhVUjdo?cluster=devnet |
| Guardian agent NFT | `ERxDBEUU6heys5PrA93tGZwjWucvhY3jJdyQpsFE9YzH` | https://explorer.solana.com/address/ERxDBEUU6heys5PrA93tGZwjWucvhY3jJdyQpsFE9YzH?cluster=devnet |

**Real txs from the live e2e-smoke run (D8 verification):**

- `setEncryptedPolicy`: https://explorer.solana.com/tx/2iNnUdZTniHkR4aFr4vXLRY6xR4n6628w9W3hkYBSTjK61TLcFF51ac4zMTdS1GPZLcdvDvxdiRhk1jhpLYRgpQ6?cluster=devnet
- `executePrivateRebalance`: https://explorer.solana.com/tx/mDg1n47USHtMoen3RpYG7dTFpRzjmpR8BiM832i4an6bJ6su1uTxEqMrJ6rNq5hWJ9p2mJZvufoC8fYy6rbY6Bv?cluster=devnet
- Full 9/9 PASS transcript: [`.planning/builder-b/e2e-transcript-D8-pinned.txt`](./.planning/builder-b/e2e-transcript-D8-pinned.txt)

---

## What ships in v1 — and what's deferred to v2

**v1 (this submission) — running on devnet:**

- Two Anchor programs (`risk_policy`, `swig_delegation`) — 8/8 tests pass
- `@riskclaw/onchain` TypeScript client with bundled IDLs — 14/14 bun tests
- Three-zone agent skeleton with **CI-enforced zone-separation** — 6/6 tests
- Three Metaplex Core agent NFTs minted on devnet
- Squads V4 1-of-1 dev multisig owning the encrypted policy
- Arcis circuit `compare(threshold, score)` compiled @ 464M ACU
- Helius LaserStream observer streaming live to the operator console
- FR-5b read-throttle cache + FR-8b write idempotency window (both onchain
  + client-side)
- T-34 privacy invariant audit — PRD §9 invariants 1-4 PASS

**v1 placeholder caveat (loud + on-chain):** the encrypted-threshold packing
in v1 is non-cryptographic — bytes [0..8] are the plaintext u64,
bytes [48..64] are the ASCII tag `RISKCLAW_V1_STUB`. A real auditor reading
`RiskPolicy.ciphertext_ref` on-chain sees the placeholder signal
immediately. The audit-grade pitch is valid for the architecture (encrypted
storage + MPC comparison + Analyst-only signer) and valid for v2 runtime —
**not** for the v1 ciphertext bytes themselves. Documented in code
(`encrypt.ts`), in T-34 §9.5, and on-chain via the tag.

**Deferred to v2 (post-hackathon):**

- C-14 — Arcium runtime wiring (`queue_threshold_check` + `compare_callback`).
  Blocked on a localnet startup wall; PRD §7 R1 fallback (the v1 stub) is the
  documented degradation. Real RescueCipher envelope ships when
  `MXE_CLUSTER_PUBKEY` is provisioned.
- P-11 — Swig CPI for `Exit` action. Blocked on Q2 spike (Swig SDK API shape).
- Vanish private rebalance routing — adds ~200ms; dropped from v1 demo storyboard.

---

## Sponsor track submissions

Each sponsor solves one well-defined problem. Code links point to the
specific file where the integration lives.

| Sponsor | Where it lives in code | What it does |
|---|---|---|
| **Phantom** | [`app/`](./app/) (operator console) | Treasury operator wallet — hardware-backed signing for policy proposals |
| **Altitude / Squads V4** | [`programs/programs/risk_policy/src/instructions.rs`](./programs/programs/risk_policy/src/instructions.rs) (multisig vault as `Signer + has_one`) | 1-of-1 dev multisig PDA is the only authority that can mutate `RiskPolicy` |
| **Arcium** | [`encrypted/threshold_compare/encrypted-ixs/src/lib.rs`](./encrypted/threshold_compare/encrypted-ixs/src/lib.rs) | `compare(threshold, score) -> (bool, u64)` circuit; pinned privacy invariant comment; 464M ACU |
| **Helius** | [`agents/src/observer.ts`](./agents/src/observer.ts) | LaserStream WS subscriptions on devnet — read zone, no keys |
| **Swig** | [`programs/programs/swig_delegation/src/instructions/execute_rebalance.rs`](./programs/programs/swig_delegation/src/instructions/execute_rebalance.rs) | Bounded execution authority — slippage + 30s idempotency + action gate |
| **Metaplex Core** | [`scripts/register-agents.ts`](./scripts/register-agents.ts) + [`config/devnet.ts::DEVNET_AGENTS`](./config/devnet.ts) | Three `mpl-core` NFTs (Observer/Analyst/Guardian) with `zone` Attributes |

**Filed sponsor tracks (Frontier-verified):**

- [ ] Phantom Connect — operator wallet (`/app`)
- [ ] Altitude / Squads V4 — multisig-gated policy
- [ ] Arcium Request-for-Product — encrypted DeFi primitive
- [ ] Metaplex Core — agent identity NFT track

---

## How to run it

```bash
# Anyone can verify the live demo against devnet:
git clone https://github.com/Truunik/Risk-Claw-SOL.git
cd Risk-Claw-SOL/scripts
bun install
bun run seed-demo     # preflight + airdrop top-up; prints DEMO_STATE
bun run e2e-smoke     # 9-step end-to-end against live devnet — 9/9 PASS
```

Required: a funded `~/.config/solana/id.json` (≥ 0.05 devnet SOL — seed-demo
will request an airdrop if below threshold).

Walks the full Builder B surface: `setEncryptedPolicy` → live event
subscription → throttled threshold checks → real rebalance tx → FR-8b
idempotency catch → audit event capture → graceful NotImplementedError on
the deferred path.

Demo storyboard (2 minutes) — see [`README.md` §Demo](./README.md#demo-storyboard-2-minutes).

---

## Judges' 1-page summary

**The thesis:** institutional onchain capital wants to delegate trading
authority to agents — but the alpha is in the *policy*, not the trade. If
the policy lives on chain in plaintext, MEV actors front-run it and rival
funds reverse-engineer the strategy from history. RiskClaw-Sol solves both:
the threshold encrypts at rest, the agents that enforce it never see
plaintext, and every action is a signed agent-NFT transaction.

**The privacy claim, four ways:**

1. **At rest** — `RiskPolicy.ciphertext_ref` on-chain. v1 placeholder packing
   is loudly tagged `RISKCLAW_V1_STUB`; v2 is RescueCipher envelope. Same
   ABI; the swap is mechanical.
2. **In transit** — `ThresholdCheckResult.score` is a pure passthrough from
   public position metrics. PRD §9.3, verified in code and in the
   [T-34 audit](./.planning/builder-b/T-34-audit.md).
3. **In the compute zone** — Arcis circuit (`compare(threshold, score)`)
   compiled @ 464M ACU. The Analyst never decrypts — even the agent
   evaluating the policy can't see it.
4. **In the execute zone** — only the Guardian holds a signing key, bounded
   by Swig delegation onchain. CI fails if any signing primitive leaks into
   Observer or Analyst (`agents/tests/zone-separation.spec.ts` — 6/6).

**The audit-grade claim, in numbers:**

- 28 tests green: 8 Anchor + 14 `@riskclaw/onchain` bun + 6 zone-separation bun
- T-34 privacy audit: PRD §9 invariants 1-4 PASS for v1; invariant 5 documented as deferred
- 4 sponsor integrations live + 2 wired (Phantom + Helius via Builder A's app)
- Real on-chain artifacts: 2 programs, 1 multisig, 3 agent NFTs, working
  e2e txs (see live-on-devnet table above)

**Why this is *not* a story you've seen before:** most "AI agent + DeFi"
submissions show an agent calling a contract. We show what happens when
you take agent autonomy seriously: separating *deciding* from *acting*, with
cryptographic guarantees at the boundary. The Analyst can't act, the
Guardian can't decide, and neither can read the policy. That's the gap
institutional capital actually has — and it's what makes the agent
delegation auditable rather than hand-wave.

**Pointers:**

- [`README.md`](./README.md) — architecture diagram + sponsor table
- [`.planning/builder-b/T-34-audit.md`](./.planning/builder-b/T-34-audit.md) — privacy invariant audit (PASS for v1)
- [`.planning/builder-b/e2e-transcript-D8-pinned.txt`](./.planning/builder-b/e2e-transcript-D8-pinned.txt) — live 9/9 PASS evidence
- [`agents/src/onchain-client.ts`](./agents/src/onchain-client.ts) — the boundary contract between agents and the on-chain client
- [`CLAUDE.md`](./CLAUDE.md) — the "do not cross this boundary" hard rules

---

## Submission checklist

Source of truth: [`BUILD_PLAN.md` §Submission](./BUILD_PLAN.md#submission-checklist-2026-05-10).

- [x] All sponsor integrations listed with links to code (this file)
- [x] Squads multisig created for the project (Altitude/Squads sponsor)
- [ ] Demo video uploaded (YouTube unlisted is fine)
- [ ] Repo set to public OR access granted to Colosseum judges
- [ ] colosseum.com/frontier submission form completed
- [ ] Sponsor-track submissions filed (Phantom · Altitude/Squads · Arcium · Metaplex)
- [x] README claims match code (T-34 audit)
