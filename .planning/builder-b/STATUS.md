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

**FOUNDATION** — toolchain install + workspace bootstraps + spike Q1 (Arcium kill-switch).

```
[●] Stream F  — Foundation        (in progress)
[ ] Stream P  — Programs
[ ] Stream C  — Circuit            (kill-switch checkpoint at task 12)
[ ] Stream Pkg — Package
[ ] Stream S  — Scripts
[ ] Stream T  — Tests
```

---

## Pipeline checklist

### Stream F — Foundation

- [ ] **F-1** Install Rust + Solana CLI (Agave 2.x) + Anchor 1.0.2 + `arcup`
- [ ] **F-2** `anchor init . --no-git` in `/programs`
- [ ] **F-3** `arcium init` (or Hello World setup) in `/encrypted/threshold_compare`
- [ ] **F-4** `bun init` workspace package at `packages/onchain/`

### Stream P — Programs

- [ ] **P-5** `anchor new risk_policy` + `RiskPolicy` account schema
- [ ] **P-6** `risk_policy::init_policy` instruction
- [ ] **P-7** `risk_policy::update_policy` with `Signer + has_one`
- [ ] **P-8** Anchor unit tests for init/update
- [ ] **P-9** `anchor new swig_delegation` + execute skeleton
- [ ] **P-10** Slippage assertion + `RebalanceAction` enum + `NotImplemented` paths
- [ ] **P-11** Swig CPI wiring for `Exit` (after Q2 spike)

### Stream C — Circuit

- [ ] **C-12** Arcis Hello World compiles ⚠️ **KILL-SWITCH CHECKPOINT**
- [ ] **C-13** `compare(threshold, score)` circuit with privacy-invariant comment
- [ ] **C-14** `queue_threshold_check` + `compare_callback` Anchor wiring (after Q5+Q7)

### Stream Pkg — Package

- [ ] **Pkg-15** `OnchainClient` import + `RealClient` skeleton
- [ ] **Pkg-16** `setEncryptedPolicy` real implementation
- [ ] **Pkg-17** `checkThresholdBreach` (queue + await callback)
- [ ] **Pkg-18** `executePrivateRebalance` (Orca quote + Swig wrapper)
- [ ] **Pkg-19** `delegateToGuardian` (Swig addAuthority — after Q2)
- [ ] **Pkg-20** `registerAgent` (Metaplex Core mint via Umi)
- [ ] **Pkg-21** `encryptThreshold` helper
- [ ] **Pkg-22** Typed errors module

### Stream S — Scripts

- [ ] **S-23** `scripts/register-agents.ts` idempotent
- [ ] **S-24** `scripts/deploy-devnet.ts` skeleton
- [ ] **S-25** Arcium circuit deploy in deploy script (after Q7)
- [ ] **S-26** `config/devnet.ts` schema and writers
- [ ] **S-27** Clean-machine end-to-end smoke run

### Stream T — Tests

- [ ] **T-28** `risk_policy` Anchor tests
- [ ] **T-29** `swig_delegation` Anchor tests
- [ ] **T-30** Arcis circuit tests (3 scenarios)
- [ ] **T-31** `RealClient` unit tests
- [ ] **T-32** `encryptThreshold` roundtrip test
- [ ] **T-33** E2E happy path on devnet
- [ ] **T-34** Privacy invariant audit (code grep + tx log inspection)

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
| (none yet — populate as encountered) |  |  |  |

---

## Implementation TBDs

Surfaced during PRD self-review. These are not spec gaps (the PRD is approved-ready); they are
implementation-time decisions that surface during specific tasks. Resolve in-task; record outcome here.

| ID | Resolve during | TBD |
|---|---|---|
| **G2** | P-11 / Pkg-18 | Compute-unit budget for `swig_delegation::execute_rebalance`. Default plan: request 600k CU via `ComputeBudgetProgram::setComputeUnitLimit` in the constructed tx. Verify under load. |
| **G3** | (new) S-23b | `scripts/seed-demo.ts` — mint USDC + paired-token LP into a demo treasury wallet on devnet. Builder B owns since it touches deployed program state. |
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
