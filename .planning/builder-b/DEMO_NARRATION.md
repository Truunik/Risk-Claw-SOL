# Demo Narration Script

Line-by-line for the 2-minute submission video. Two variants — pick based on
whether Builder A's swap landed:

- **Variant A** (paired) — Phantom + `/app/policy` + `/app/audit` + agents terminal
- **Variant B** (CLI fallback) — terminal only, `bun run seed-demo` + `bun run e2e-smoke`

Read aloud while recording. Pacing notes in `[brackets]`. Speak normally —
don't perform.

---

## Variant A — Paired flow (~2:00)

Layout: browser left half (split: policy editor top, audit page bottom),
terminal right half. Mic on.

### 0:00 — open (10s)

> **"This is RiskClaw — autonomous risk policy enforcement for institutional onchain capital. The policy is encrypted at rest, the agents that enforce it never see the plaintext, and every action they take is signed by an on-chain identity. Built on Solana for the Colosseum Frontier hackathon."**

`[click Phantom Connect — show the wallet address top-right of /app]`

### 0:15 — encrypt the policy (15s)

`[switch to /app/policy]`

> **"The operator drafts a policy — drawdown threshold of nine thousand basis points. It encrypts client-side before it ever leaves the browser. Bytes 48 through 64 of the ciphertext are tagged 'RISKCLAW_V1_STUB' — that's our honest on-chain signal: this is the v1 placeholder packing, not RescueCipher. We're not pretending."**

`[hover over the ciphertext preview — let viewers read the tag]`

### 0:30 — submit through Squads (15s)

> **"Submitting routes through a one-of-one Squads multisig — the institutional approval layer. The encrypted policy lands in the on-chain RiskPolicy account, owned by the multisig vault PDA. Only the vault can ever mutate it."**

`[click submit; show the Explorer link to the setEncryptedPolicy tx]`

### 0:45 — observer streams (15s)

`[switch to agents terminal — bun run dev already running]`

> **"Read zone: the Observer streams position metrics from Helius LaserStream. No signing key, no policy access — it's structurally incapable of executing anything. Synthetic drawdown ramps up — five hundred basis points, fifteen hundred, thirty-five hundred. Watch the breach line."**

`[point at the terminal as breach line crosses]`

### 1:00 — analyst evaluates (15s)

> **"Compute zone: the Analyst calls checkThresholdBreach. The encrypted threshold gets compared against the metrics inside an Arcium MPC circuit — the Analyst itself never decrypts. It receives only 'breached' and 'score' — never the threshold. There's an FR-5b throttle cache so it doesn't hammer the circuit every tick."**

`[the breach=true line appears]`

### 1:15 — guardian executes (15s)

`[switch to /app/audit]`

> **"Execute zone: only the Guardian holds a signing key, and it's bounded by Swig delegation on-chain — slippage gate, action whitelist, thirty-second idempotency window. It fires execute_rebalance. The audit page picks up the live RebalanceExecutedEvent — Guardian's Core NFT identity, size, timestamp, real on-chain receipt."**

`[the new row should animate in — pause on it]`

### 1:30 — idempotency proof (15s)

> **"Re-fire the policy submit. FR-8b: the prior tx signature returns from cache — no double-swap, no race. The Anchor program rejects within thirty seconds onchain even if a client tries to spam it."**

`[click re-submit; show audit page does NOT add a duplicate]`

### 1:45 — close (15s)

> **"Three Metaplex Core NFTs on-chain — one per zone — make every agent action verifiably tied to its trust zone. T-34 privacy audit passes for v1 invariants one through four. v2 wires real RescueCipher and Arcium MXE — but the architecture is already honest on-chain through the RISKCLAW_V1_STUB tag any judge can grep."**

`[show repo URL: github.com/Truunik/Risk-Claw-SOL]`

> **"RiskClaw-Sol. Repo, audit, and full demo transcript are linked in the submission."**

---

## Variant B — CLI fallback (~2:00)

Layout: terminal full-screen, large font (≥18pt), dark background. Mic on.

### 0:00 — open (10s)

> **"This is RiskClaw — encrypted-threshold risk policy enforcement on Solana. The on-chain ciphertext, the agent identity NFTs, and every transaction in this demo are real. Live on devnet."**

```bash
cd scripts && bun run seed-demo
```

### 0:15 — preflight (15s)

`[output appears]`

> **"Preflight: two Anchor programs deployed at FNThNj and 9ECtiz on devnet, the Squads V4 dev multisig PDA exists, three agent NFTs minted on devnet — Observer, Analyst, Guardian. Threshold pinned at nine thousand."**

`[scroll to bottom of seed-demo output]`

```bash
bun run e2e-smoke
```

### 0:30 — step 2 set policy (20s)

`[step 2 line prints]`

> **"Step two: the operator encrypts the threshold and submits. The ciphertext lands in the RiskPolicy account on devnet — that's a real Solana transaction, link is right there in the output. Tag at bytes 48 through 64 is 'RISKCLAW_V1_STUB' — the honest v1 placeholder signal."**

`[pause on the explorer URL — point at it]`

### 0:50 — steps 4-6 threshold checks (20s)

`[step 4 prints, then a 5.2s wait, then step 5 + 6]`

> **"Steps four through six exercise the read throttle cache. Low drawdown — no breach. Wait for the five-second cache window. High drawdown — breach. Re-call within five seconds with new metrics — the prior result returns from cache, deterministic, no double-evaluation."**

### 1:10 — step 7 execute rebalance (20s)

`[step 7 — the RebalanceExecutedEvent line should print first, then the tx confirmation]`

> **"Step seven: the Guardian fires execute_rebalance. Slippage gate, action gate, idempotency window — all checked on-chain. The RebalanceExecutedEvent fires; the script's event subscription captures it; the Explorer link is a real on-chain receipt."**

`[hover on the explorer URL for executePrivateRebalance]`

### 1:30 — steps 8-9 (15s)

`[step 8 + 9 print]`

> **"Step eight: re-fire within thirty seconds. The Anchor program rejects with RebalanceTooSoon; the client catches it and returns the prior signature. No double-swap. Step nine: delegateToGuardian throws NotImplementedError cleanly — that's a v2 boundary, documented, not a crash."**

### 1:45 — close (15s)

`[ALL 9 STEPS PASSED screen]`

> **"All nine steps passed against live Solana devnet. Twenty-eight tests green across Anchor, the TypeScript client, and the agent zone-separation invariant. Privacy audit T-34 confirms four of five invariants hold in v1; the fifth is documented as deferred. Repo, audit, full transcript — all linked."**

> **"RiskClaw-Sol. github.com/Truunik/Risk-Claw-SOL."**

`[cut]`

---

## Things NOT to say (avoidance list)

- ❌ "Our agents never see the policy" — too strong for v1. Say "the agents that enforce it never see the plaintext" (which is structurally true in v1 via zone separation; cryptographically true in v2 via Arcium).
- ❌ "Cryptographic privacy" applied to v1 ciphertext — the RISKCLAW_V1_STUB tag is loudly NOT cryptographic. Frame v1 as "honest placeholder, on-chain auditable" and v2 as "live RescueCipher".
- ❌ Promise features that are in PRD but didn't ship (Vanish, full Swig CPI for Exit). Mention them as v2 only if asked.
- ❌ Read the README out loud verbatim. The video is for color; the README is for grep.
- ❌ Long pauses (>3s). Either cut or fill — "and over here…"

---

## Variant decision tree

```
Builder A's swap merged to main before recording?
├── YES → record Variant A (paired). Re-runnable via verify-onchain.ts + e2e-smoke
└── NO  → record Variant B (CLI). Bail-out is documented and shipping
```

Either way, the on-chain state is the same. `bun run verify-onchain` confirms it in ~5s — run it once before recording for receipts.
