# D8 Handoff to Builder A — 2026-05-10

Paste-ready team-thread message. Trim to channel-fit if needed.

---

**Builder B — D8 ship-batch is up: PR #6** (https://github.com/Truunik/Risk-Claw-SOL/pull/6)

What's in `main` after PR #5 + PR #6:

- **Bundled IDLs in `@riskclaw/onchain`** — `riskPolicyIdl` + `swigDelegationIdl` exported. No Anchor CLI needed on your device.
- **3 Metaplex Core agent NFTs live on devnet** — Observer / Analyst / Guardian. Mints in `config/devnet.ts::DEVNET_AGENTS`.
- **`@riskclaw/onchain.registerAgent`** resolves the on-chain mint by zone (no more `NotImplementedError`).
- **Zone-separation invariant test** in `agents/tests/` — CI fails if anyone leaks `Keypair` / `signTransaction` / etc. into observer.ts or analyst.ts.
- **`scripts/seed-demo.ts`** — preflight + airdrop top-up + pinned `DEMO_STATE` (threshold, 2-stage drawdown ladder, EXIT/10000bps).
- **`scripts/e2e-smoke.ts`** — 9-step end-to-end orchestrator. Run it and the demo IS the screen recording.
- **T-34 privacy invariant audit** at `.planning/builder-b/T-34-audit.md` — PRD §9 invariants 1-4 PASS for v1; v1 placeholder packing (`RISKCLAW_V1_STUB` tag) is loud + documented.

---

**Your turn — RealClient swap (~2-3h):**

1. Pull `main`, no `anchor build` needed.
2. In `app/lib/onchain.ts` (or wherever `appStubClient` lives), swap to:
   ```ts
   import { createRealClient, riskPolicyIdl, swigDelegationIdl } from "@riskclaw/onchain";
   const client = createRealClient({
     connection,
     wallet,        // shimmed Phantom adapter → anchor.Wallet
     cluster: "devnet",
     riskPolicyIdl,
     swigDelegationIdl,
   });
   ```
3. Wire `/app/audit` to live program events — replace `generateDemoEvents()` with `program.addEventListener("rebalanceExecutedEvent", …)`. Pattern in `scripts/e2e-smoke.ts` step 3.

Step-by-step in `.planning/builder-a-swap-guide.md` if you want the full diff.

**Definition of Done:**
- Policy editor submit produces a real `setEncryptedPolicy` tx on devnet.
- `/app/audit` lists at least one real `RebalanceExecutedEvent` after a paired e2e run.

**Then we run T-33 paired:** Phantom → policy editor → multisig auto-exec → observer drift breach → audit page renders the real event. That paired run IS the demo recording.

---

**Pre-flight before T-33:**

```bash
cd scripts && bun install && bun run seed-demo   # airdrop top-up + show pinned DEMO_STATE
bun run e2e-smoke                                # 9/9 against live devnet — sanity check
```

Ping me when you're on step 3 and we'll co-watch the paired run.

---

**Status:** 28 tests green (8 anchor + 14 onchain bun + 6 agents bun). Programs live, agents minted, Helius streaming. Submission deadline tomorrow (2026-05-11) — the only critical-path item left is your swap + the paired recording.
