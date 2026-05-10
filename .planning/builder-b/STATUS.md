# Builder B — STATUS

Live state for Builder B's execution. Updated as work progresses.

| Field | Value |
|---|---|
| **PRD** | [`PRD.md`](./PRD.md) |
| **Branch** | `builder-b/foundation` |
| **Phase** | Foundation (pre-execution) |
| **PRD approval** | ☐ Not yet approved |

---

## Current phase

**Stream P + Pkg + S all in motion.** Five atomic feature commits shipped (`78c6118`, `56ac103`, `5d16261`, `6d3b562` + the merge). 19 tests green across all surfaces (3 Anchor + 5 Anchor + 11 bun). Builder A unblocked for `appStubClient` → `RealClient` swap.

```
[●] Stream F  — Foundation        100% (F-1, F-2, F-3, F-4)
[◐] Stream P  — Programs            6/8 (P-5..P-7, P-9..P-10b done; P-11 deferred Q2)
[◐] Stream C  — Circuit              2/3 (C-12, C-13 done; C-14 deferred — needs localnet fix)
[◐] Stream Pkg — Package             6/8 active + 2 NotImplemented stubs (Pkg-19 Q2, Pkg-20 Metaplex)
[◐] Stream S  — Scripts              3/4 (S-23 + S-24 + S-27b done; S-23b pending)
[◐] Stream T  — Tests                4/8 written (T-28 + T-29/T-29b + T-31b + T-32 — 19 pass total)
```

---

## Pipeline checklist

### Stream F — Foundation

- [x] **F-1** Toolchain installed: Rust 1.95.0, Solana CLI 3.1.14 (Agave), Anchor 1.0.2, Yarn 1.22.22, bun 1.3.11, Docker 29.4.0 (via OrbStack), Arcium `arcup` + `arcium` 0.9.7.
- [x] **F-2** `anchor init programs --package-manager bun --no-git` (commit `5179cc5`). Default stub program removed; `risk_policy` + `swig_delegation` workspace members; `anchor build` exit 0.
- [x] **F-3** Arcium project scaffolded at `/encrypted/threshold_compare/` (commit `0890c77`). Hello World `add_together` circuit compiled; `arcium build` exit 0. Q1 KILL-SWITCH RESOLVED.
- [x] **F-4** `packages/onchain/` bun workspace package (commit `c7c9c52`). Re-exports `OnchainClient` + shared types from `agents/src/`; typecheck exit 0 on both sides of the boundary.

### Stream P — Programs

- [x] **P-5/P-6/P-7** RiskPolicy schema + init_policy + update_policy with Squads `Signer + has_one` (commit `78c6118`). 185-byte account; T-28 ✓ (3/3 anchor test). Schema fix: `last_rebalanced_at` moved off RiskPolicy → swig_delegation's `LastRebalanced` PDA (Solana ownership rules).
- [x] **P-8** T-28 covers happy path + non-vault rejection (rolled into P-5/P-7 commit).
- [x] **P-9/P-10/P-10b** swig_delegation::execute_rebalance with B3 idempotency + slippage gate + NotImplemented for Reduce/Hedge (commit `56ac103`). T-29 + T-29b ✓ (5/5 anchor test).
- [ ] **P-11** Swig CPI wiring for `Exit` (deferred — Q2 spike: Swig SDK API)

### Stream C — Circuit

- [x] **C-12** Arcis Hello World compiles (commit `0890c77`). Q1 KILL-SWITCH PASSED.
- [x] **C-13** `compare(threshold, score) -> (bool, u64)` circuit (commit `c9140f7`). Privacy invariant in code comment; `.reveal()` on the boolean; score passthrough; `arcium build` exit 0; `build/compare.arcis.ir` weighs 464M ACUs.
- [ ] **C-14** `queue_threshold_check` + `compare_callback` Anchor wiring in `risk_policy` (Q5+Q7 resolved by Hello World scaffold — uses `queue_computation` + `ArgBuilder` + `#[arcium_callback(encrypted_ix = "compare")]`)

### Stream Pkg — Package

- [x] **Pkg-15..22 atomic** RealClient + errors + encrypt + ids + tests (commit `5d16261`). 11/11 bun tests passing in 251ms.
  - [x] **Pkg-15** RealClient class + `createRealClient` factory
  - [x] **Pkg-16** `setEncryptedPolicy` real (Anchor program init/update via Squads-vault wallet)
  - [x] **Pkg-17** `checkThresholdBreach` v1 stub (deterministic mock from drawdownBps; real Arcium runtime in C-14)
  - [x] **Pkg-17b** FR-5b read-throttle cache (5s window, per-policy `Map<positionId, {lastCheckedAt, lastResult}>`)
  - [x] **Pkg-18** `executePrivateRebalance` real (calls swig_delegation::executeRebalance with EXIT action)
  - [x] **Pkg-18b** FR-8b idempotency catch (`RebalanceTooSoon` → prior cached `TxSig`)
  - [ ] **Pkg-19** `delegateToGuardian` — throws NotImplementedError (deferred, Q2)
  - [ ] **Pkg-20** `registerAgent` — throws NotImplementedError (deferred, Metaplex Core wiring)
  - [x] **Pkg-21** `encryptThreshold` v1 placeholder packing with `RISKCLAW_V1_STUB` audit tag; `MXE_CLUSTER_PUBKEY` placeholder export
  - [x] **Pkg-22** 7 typed error classes (RiskclawError base + ArciumTimeout/ClusterUnavailable/SlippageRejected/NotImplemented/MultisigSignatureRejected/OnchainRejection)

### Stream S — Scripts

- [x] **S-23** `scripts/register-agents.ts` (commit `f76b815`). Three Core NFTs minted on devnet (Observer/Analyst/Guardian); each owned by a dedicated zone keypair under `scripts/.keys/` (gitignored); Attributes plugin populated with `zone` + `agent_pubkey`. Idempotent re-runs verify on-chain via `fetchAssetV1`.
- [ ] **S-23b** `scripts/seed-demo.ts` — demo Orca LP into demo treasury (B4)
- [x] **S-24** `scripts/deploy-devnet.ts` (commit `6d3b562`). Idempotent, --dry-run mode, auto-patches config/devnet.ts via regex on existing `RISK_POLICY_PROGRAM_ID` / `SWIG_DELEGATION_PROGRAM_ID` lines. Awaits operator-driven first run on devnet (needs ≥4 SOL airdropped).
- [ ] **S-25** Arcium circuit deploy step (deferred — C-14 dependency)
- [x] **S-26** `config/devnet.ts` schema is set by Builder A (PR #3); deploy-devnet.ts populates the program ID slots.
- [ ] **S-27** Clean-machine end-to-end smoke run (manual; gated on real devnet deploy)
- [x] **S-27b** `scripts/e2e-smoke.ts` — automated 9-step demo orchestrator. ALL 9 STEPS PASSED against live devnet: setEncryptedPolicy (update path) → live `RebalanceExecutedEvent` subscription → low/high drawdown checks → FR-5b cache hit → executePrivateRebalance (event captured: `size=10000bps`) → FR-8b idempotency → delegateToGuardian throws NotImplementedError. Run via `bun run e2e-smoke` from `scripts/`.

### Stream T — Tests

- [x] **T-28** `risk_policy` Anchor tests — 3/3 (AC-1, AC-1b, AC-2 in commit `78c6118`).
- [x] **T-29** `swig_delegation` Anchor tests — 3/3 (AC-5, AC-6, AC-7 in commit `56ac103`).
- [x] **T-29b** `RebalanceTooSoon` rejection — pass with state-not-advanced assertion (commit `56ac103`).
- [ ] **T-30** Arcis circuit tests (3 scenarios) — deferred until C-14 enables `arcium test`.
- [ ] **T-30b** Analyst-only signer rejection test (G1, AC-11) — deferred to C-14.
- [x] **T-31b** Throttle cache + idempotency catch — 7/7 bun tests (commit `5d16261`).
- [x] **T-32** `encryptThreshold` roundtrip + RISKCLAW_V1_STUB tag — 4/4 bun tests (commit `5d16261`).
- [x] **T-33** Integration smoke against deployed devnet — `smoke-realclient.ts` 3/3 PASS (commit `0f0035e`). Verifies setEncryptedPolicy, executePrivateRebalance, FR-8b cache, PDA seed match, IDL alignment.
- [x] **T-34** Privacy invariant audit (commit `b15fd51`). PRD §9 invariants 1-4 PASS for v1; invariant 5 deferred to C-14. Full report at `.planning/builder-b/T-34-audit.md`.

---

## Open spikes (must resolve to unblock specific tasks)

| Spike | Question | Blocks tasks |
|---|---|---|
| **Q1** | Arcium devnet/localnet support? | Test strategy for circuit; **kill-switch readiness** |
| **Q2** | Swig SDK package name + `sign_v1` inner-ix shape? | P-11, Pkg-19 |
| **Q3** | Squads V4 program ID + vault PDA seeds? | P-6 (constraint correctness) |
| **Q4** | Arcis u64 supported? | C-13 |
| **Q5** | Arcium queue_computation sync vs async? | C-14 callback pattern |
| **Q6** | `app.squads.so` devnet deeplink works? | Builder A's UI strategy |
| **Q7** | Arcium circuit registration produces a `arcium_handle`? | S-25 |

Update spike resolution in `PRD.md` Section 6.

---

## Active blockers

| ID | Description | Owner | Action needed |
|---|---|---|---|
| (none) | Q1-Docker resolved 2026-05-08 via OrbStack (free, no admin prompts beyond first-launch). `arcium build` exit 0 with our `compare` circuit. |  |  |

---

## Implementation TBDs

Surfaced during PRD self-review. These are not spec gaps (the PRD is approved-ready); they are
implementation-time decisions that surface during specific tasks. Resolve in-task; record outcome here.

| ID | Resolve during | TBD |
|---|---|---|
| **TBD-RateLimit** | Pkg-17b | ✅ Resolved in PRD §2.4 FR-5/FR-5b. Pipeline task Pkg-17b + test T-31b added. |
| **TBD-RunPlaceholder** | (Builder A action) | Builder A's `agents/src/run.ts:31` placeholder uses `action: "REDUCE"`; v1 only ships `EXIT`. Flagged in CONTINUE.md. Builder A changes to `"EXIT"` when swapping `stubClient` → `RealClient`. Builder B does not block on this. |
| **B1** | T-30b | ✅ Resolved — Analyst-only signer rejection test added to §8 AC-11 + STATUS T-30b. |
| **B2** | T-31b | ✅ Resolved — FR-5b cache test added to §8 AC-12 + STATUS T-31b. |
| **B3** | P-10b / Pkg-18b / T-29b | ✅ Resolved — write-side idempotency: `RiskPolicy.last_rebalanced_at` + `swig_delegation::execute_rebalance` rejects within 30s window with `RebalanceTooSoon`; `RealClient.executePrivateRebalance` (FR-8b) catches and returns prior `TxSig`. PRD §2.1, §2.2, §2.4, §8 AC-13, §9 "Write-side idempotency" all updated. |
| **B4** | S-23b / S-27b | ✅ Resolved — `seed-demo.ts` formalized in PRD §2.7; `e2e-smoke.ts` formalized in PRD §2.8. Pipeline tasks S-23b + S-27b added. |
| **B5** | Pkg-15 | ✅ Resolved — `createRealClient` factory signature in PRD §5 now specifies optional `arciumClusterPubkey`, `readThrottleMs` (5_000 default), `writeThrottleMs` (30_000 default). |
| **G2** | P-11 / Pkg-18 | Compute-unit budget for `swig_delegation::execute_rebalance`. Default plan: request 600k CU via `ComputeBudgetProgram::setComputeUnitLimit` in the constructed tx. Verify under load. |
| **G3** | S-23b | ✅ Now formal §2.7 sub-feature; was previously a TBD-only item. |
| **G4** | T-28 | Anchor test approach for Squads vault signing: lean toward `solana_program_test` `set_account` injection for unit tests; manual e2e against real Squads on devnet for integration. |
| **G5** | Pkg-16 | ✅ Resolved in PRD §5 — `buildSetEncryptedPolicyIx` + `buildUpdateEncryptedPolicyIx` exposed alongside `setEncryptedPolicy` convenience wrapper. |
| **G6** | Pkg-21 / S-24 | ✅ Resolved in PRD §5 — `MXE_CLUSTER_PUBKEY` exported from `@riskclaw/onchain`, populated by `deploy-devnet.ts` from Arcium cluster. |
| **G7** | P-11 / Pkg-19 | `DelegationPolicy.allowedInstruments` format — pin to "base58-encoded program IDs only (v1)"; instruction-level scoping is v2. Document in package README. |
| **U1** | Pkg-16 | `setEncryptedPolicy` convenience path returns `TxSig` of `vault_transaction_execute`; institutional path uses `buildSetEncryptedPolicyIx` for unsigned ix. (Resolved by G5.) |
| **U2** | Pkg-17 | Callback polling: prefer WebSocket via `connection.onLogs` for the program; fallback to `getSignatureStatuses` polling at 1s if WS unavailable. |
| **U3** | F-4 | IDL copy: `prebuild` script in `packages/onchain/package.json` running `cp programs/target/idl/*.json src/idl/` after `anchor build`. |
| **U4** | T-28 | Anchor tests: ts-mocha for compatibility with Anchor's TypeScript fixtures. |
| **U5** | All P / C tasks | Logging policy: `msg!` allowed for event emission and rejection-error context only. No account-data dumps. No score values. |
| **U6** | S-23 | `register-agents.ts` validates each registry entry against on-chain existence (`fetchAssetV1`); skips only if asset exists AND owner matches the keypair. |
| **U7** | S-25 | Deploy script destructively wipes existing `RiskPolicy` PDAs before redeploy when the `arcium_handle` rotates. Loud confirmation prompt; not silent. |
| **D1** | Demo prep | Vanish status: drop from BUILD_PLAN demo storyboard (1:20–1:45 slot becomes "Routed through Solana directly; Vanish integration v2"). Cleaner than half-wiring. |
| **D2** | Demo prep | Demo restoration after EXIT: re-running `init_policy` after first run requires either `update_policy` path or a `close_policy` instruction. Default: `update_policy` for v1 (cheaper). |
| **D3** | Demo prep | Demo wallet seed: Builder A owns the demo Phantom wallet for the operator persona; Builder B owns the deploy keypair + 3 agent keypairs. |

---

## Boundary state with Builder A

| Surface | State |
|---|---|
| `OnchainClient` interface | ✅ Locked in `agents/src/onchain-client.ts` |
| Shared types | ✅ Locked in `agents/src/types.ts` |
| `stubClient` swap point | ⏳ Pending Pkg-15..22 (Builder A's `agents/src/run.ts:9`) |
| `config/devnet.ts` | ⏳ Will be created by S-23/S-24 |
| Arcium MXE cluster pubkey | ⏳ Will be added to `config/devnet.ts` after Q1 spike |

If a new TS-side surface is discovered (e.g., a missing function), open a discussion in this STATUS file under "Boundary changes proposed" and **do not change the locked types** without Builder A sign-off.

---

## Boundary changes proposed

(none yet — append entries with rationale and Builder A's response)

---

## Recently completed

(none yet)

---

## Notes for the next session

- The kill-switch checkpoint (C-12) is the highest-risk task. Resolve Q1 before or during it.
- `@riskclaw/onchain` should be importable from Builder A's code as soon as Pkg-16 + Pkg-17 are passing typecheck. Don't gate the swap on full Pkg completion.
- The privacy invariant audit (T-34) is non-negotiable for "approved for execution" status. It's a code review, not a test.
