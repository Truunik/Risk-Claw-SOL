# D9 Submission Runbook — 2026-05-11

Ordered actions for the last ~6 hours before the Colosseum Frontier deadline.
Tick boxes as you go. Times are *approximate* — adjust to your local deadline.

Source of truth for paste-ready copy: [`SUBMISSION.md`](./SUBMISSION.md).

---

## T-6h to T-5h — Pre-flight (30 min)

Goal: confirm every moving part still works before recording.

- [ ] **Sync the repo** — `git pull` on `main`. Confirm HEAD ≥ `4256930`
      (SUBMISSION.md present).
- [ ] **Verify wallet balance** — `solana balance --url devnet`. If
      < 0.05 SOL, run `solana airdrop 1 --url devnet`. seed-demo will also
      attempt this but a manual top-up is faster.
- [ ] **Run preflight** — `cd scripts && bun install && bun run seed-demo`.
      Confirm: programs ✓, multisig ✓, agents ✓, balance ✓, DEMO_STATE printed.
- [ ] **Smoke the demo path** — `bun run e2e-smoke`. **MUST print
      "ALL 9 STEPS PASSED"**. Capture the new transcript to
      `.planning/builder-b/e2e-transcript-D9-recording.txt` (just for the
      record — it's not committed).
- [ ] **Verify the on-chain state** — `bun run verify-onchain`. Read-only,
      ~5s. **MUST print "ALL CHECKS PASSED"**. Confirms the RISKCLAW_V1_STUB
      tag is at bytes [48..64] in the live RiskPolicy account, and all 3
      Core NFTs carry their correct `zone` attribute.
- [ ] **If e2e-smoke FAILS:** stop. Read the failing step. Common causes:
      (a) devnet RPC flaky → re-run; (b) FR-8b idempotency window from a
      prior run → wait 60s, re-run; (c) wallet insufficient → airdrop.
      Do NOT proceed to recording until 9/9 passes.
- [ ] **Builder A status check** — has the `appStubClient` → `createRealClient`
      swap landed? If yes → record the paired flow (better demo). If no →
      record the CLI fallback (still a complete submission).

**Bail-out criterion:** if e2e-smoke is still failing 30 min in, skip the
swap-coordination loop and record the CLI fallback. A working demo beats
a delayed one.

---

## T-5h to T-4h30 — Record the demo (~30 min)

**Narration script** (read aloud while recording, both variants):
[`.planning/builder-b/DEMO_NARRATION.md`](./.planning/builder-b/DEMO_NARRATION.md).

### Variant A — paired flow (if Builder A's swap landed)

Storyboard: [`README.md` §Demo](./README.md#demo-storyboard-2-minutes).

- [ ] **Open three windows side-by-side:** browser at `/app/policy`,
      browser at `/app/audit`, terminal with `agents/` ready to run.
- [ ] **0:00** — Connect Phantom on `/app`. Show the Squads dev multisig
      address top-right.
- [ ] **0:15** — Open `/app/policy`. Enter threshold = 9000. Show the
      ciphertext preview — point to the `RISKCLAW_V1_STUB` tag bytes.
- [ ] **0:30** — Submit policy. Show the Squads auto-exec → confirmation
      on Explorer (open the tx link inline).
- [ ] **0:45** — Open the agents terminal. Run `bun run dev` (Helius
      observer). Show the synthetic drawdown stream — point at the
      breach line.
- [ ] **1:00** — Switch to `/app/audit`. Show the live
      `RebalanceExecutedEvent` row appear — Guardian's Core NFT signer,
      size, timestamp.
- [ ] **1:30** — Re-fire the policy submit. Show FR-8b idempotency — the
      audit page should NOT add a duplicate row.
- [ ] **2:00** — Cut to scoreboard: "Audit-grade architecture. Encrypted
      policy. MPC comparison. Agent identities on-chain. v2 wires
      RescueCipher + Arcium MXE — flagged on-chain with
      `RISKCLAW_V1_STUB` so it's never confused with cryptographic privacy."

### Variant B — CLI fallback (if swap didn't land)

- [ ] **Open terminal, full-screen, large font (16-20pt).** Black or dark
      background plays better on video.
- [ ] **0:00** — `cd scripts && bun run seed-demo`. Narrate: "Preflight —
      programs live, multisig live, three agent NFTs minted on devnet.
      Threshold pinned at 9000."
- [ ] **0:25** — `bun run e2e-smoke`. Narrate step-by-step as each
      `✓ step N` line appears:
      - step 2: "Encrypted threshold lands in `RiskPolicy` on devnet — real
        Solana transaction." *(point to explorer URL)*
      - step 4-6: "FR-5b throttle cache — 5-second window. Low drawdown
        doesn't breach; high drawdown does; cached result returns within
        the window even with new metrics."
      - step 7: "Guardian fires `execute_rebalance` — slippage gate +
        action gate + idempotency window all checked onchain.
        `RebalanceExecutedEvent` emitted." *(point to explorer URL)*
      - step 8: "FR-8b idempotency — re-call within 30s returns the
        cached prior TxSig. No double-swap."
      - step 9: "Deferred path throws `NotImplementedError` cleanly — not
        a crash, a documented v2 boundary."
- [ ] **1:50** — "All nine steps pass against live devnet. Every link in
      the output is a real on-chain tx. v2 wires RescueCipher + Arcium
      MXE; v1 is loudly tagged on-chain so judges can grep it."
- [ ] **2:00** — End screen with repo URL.

**Recording tools:** Loom, OBS, or QuickTime (macOS). Mic-on is fine; no
need for fancy audio.

---

## T-4h30 to T-4h — Upload (~15 min)

- [ ] **Watch the recording back at 1.5x.** Look for: terminal output
      truncation, dead air > 3s, factual misstatements.
- [ ] **If a re-take is needed:** budget 15 min for it. Two takes is the
      max — perfect is the enemy of submitted.
- [ ] **Upload to YouTube** as **Unlisted** (NOT private). Title:
      `RiskClaw-Sol — Colosseum Frontier demo`. Description: paste the
      one-line pitch from SUBMISSION.md + repo URL.
- [ ] **Copy the YouTube URL.** You'll paste it into the form.
- [ ] **Add the YouTube link to SUBMISSION.md** — replace the
      `Demo video uploaded` checkbox line with the link.

---

## T-3h to T-2h — Fill the colosseum.com form (~45 min)

Submission form is at https://colosseum.com/frontier (sign in required).
Field-by-field draft below — copy from SUBMISSION.md exactly so the
public copy matches what's in the form.

- [ ] **Project name:** `RiskClaw-Sol`
- [ ] **Tagline / short pitch:** see SUBMISSION.md "One-line pitch"
      (≤ 280 chars, validated).
- [ ] **Long description:** paste SUBMISSION.md "Long description"
      section. Strip the heading.
- [ ] **GitHub URL:** `https://github.com/Truunik/Risk-Claw-SOL`
      (confirm visibility — see T-1h section).
- [ ] **Demo video URL:** YouTube link from upload step.
- [ ] **Live demo URL** (if asked): leave blank or paste devnet program
      address from SUBMISSION.md "Live on Solana devnet" table.
- [ ] **Track / category:** select the verticals that fit (likely:
      Infrastructure, DeFi, Privacy, Agents — whichever options exist).
- [ ] **Team members:** add both builders by email/handle.
- [ ] **Additional info / what makes this special:** paste the "Why this
      is not a story you've seen before" paragraph from SUBMISSION.md
      Judges' summary.

**Do NOT submit yet.** Save as draft. The form usually allows preview.

---

## T-2h to T-1h30 — File sponsor tracks (~30 min)

Each verified Frontier sponsor has its own track. Per SUBMISSION.md
"Sponsor track submissions":

- [ ] **Phantom Connect** — Project URL + describe `/app` operator wallet
      connection. Code link:
      `https://github.com/Truunik/Risk-Claw-SOL/tree/main/app`.
- [ ] **Altitude / Squads V4** — Project URL + describe the multisig-gated
      policy mutation. Code link:
      `programs/programs/risk_policy/src/instructions.rs`.
- [ ] **Arcium Request-for-Product** — Describe the encrypted DeFi
      primitive. Loudly note the v1 placeholder + v2 plan
      (RescueCipher envelope). Code link:
      `encrypted/threshold_compare/encrypted-ixs/src/lib.rs`.
- [ ] **Metaplex Core agent identity** — Describe the three agent NFTs
      (one per zone) with the `zone` Attribute. Code link:
      `scripts/register-agents.ts` + on-chain mints from SUBMISSION.md.

**Optional / stretch tracks** (only if the form lets you check more
without re-writing): Helius (observer infrastructure), Swig (bounded
delegation).

---

## T-1h to T-30m — Final verify (~30 min)

- [ ] **Repo visibility** — is `Truunik/Risk-Claw-SOL` PUBLIC, or have
      you added Colosseum judges as collaborators? PUBLIC is safer.
      Settings → General → Danger Zone → Change visibility.
- [ ] **README renders cleanly on github.com** — open the repo in
      incognito. Status checklist, demo storyboard, sponsor table all
      readable. No broken file links.
- [ ] **SUBMISSION.md links** — click through 3-4 of the file links in
      the sponsor table to confirm none are 404. (We verified them at
      commit time; re-check in case a rename happened.)
- [ ] **Demo video plays** — open the YouTube link in incognito,
      confirm Unlisted (not Private) and starts playing.
- [ ] **Form preview** — read the entire submission form preview. Look
      for: typos in tagline, broken markdown in description, wrong
      video link, missing track box.

---

## T-15m — Submit (5 min)

- [ ] **One last sanity sip of water.** It's fine. You've shipped it.
- [ ] **Click submit on the main form.**
- [ ] **Click submit on each filed sponsor track.**
- [ ] **Screenshot the submission confirmation page** — save to
      `.planning/builder-b/submission-confirmation.png` if you want a
      receipt.
- [ ] **Post in team thread:** "Submitted — TX/IDs/link"

---

## After-submit (optional, ~15 min)

- [ ] **Add a top-of-README banner**: `> Submitted to Colosseum Frontier
      on 2026-05-11.` with link to the public submission page if
      Colosseum exposes one.
- [ ] **Tag the submitted commit** — `git tag -a v0.1.0-frontier -m
      "Colosseum Frontier submission"` + `git push --tags`.
- [ ] **Final CONTINUE.md update** — flip "Submit on
      colosseum.com/frontier" to ✓; bump Last updated.
- [ ] **Post on X** if that's part of the playbook — link to repo +
      one-line pitch.

---

## Common failure modes (don't panic)

| Symptom | Cause | Fix |
|---|---|---|
| `e2e-smoke` step 7 fails with `RebalanceTooSoon` | Prior run within 30s | Wait 60s, re-run |
| `e2e-smoke` step 5 returns `breached=false` | FR-5b cache from prior `breached=false` not expired | Wait 5.2s (script does this); if still failing, restart bun |
| `setEncryptedPolicy` fails | RPC flaky or wallet OOF | Retry; check `solana balance --url devnet` |
| Form rejects tagline | > 280 chars | Trim — see SUBMISSION.md for a fitted version |
| YouTube upload Q&A about copyright | Music? | Remove music; voice-only is enough |
| Sponsor form asks for a specific tx | Use the live txs from SUBMISSION.md "Real txs" |

---

## What's in `main` already (no further work needed)

- ✅ Code: PR #4, PR #5, PR #6 all merged. 28 tests green.
- ✅ Live on devnet: 2 programs + 1 multisig + 3 agent NFTs.
- ✅ Working e2e demo path: `seed-demo` + `e2e-smoke`.
- ✅ Privacy audit (T-34): PASS for v1 invariants 1-4.
- ✅ Submission copy: SUBMISSION.md.
- ✅ This runbook: RUNBOOK.md.

**The only critical-path items left are above this line: record, upload,
fill form, submit.** Everything else is post-game.
