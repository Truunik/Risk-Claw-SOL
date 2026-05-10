// scripts/e2e-smoke.ts
// PRD task S-27b (PRD §2.8). Pre-merge gate / demo recording orchestrator.
//
// Walks through the full Builder B surface against the live devnet state,
// asserting each step. Designed so a screen recording of `bun run e2e-smoke`
// IS the demo: every line of output narrates what just happened on-chain.
//
// Preconditions (script will warn if missing):
//   - risk_policy + swig_delegation programs deployed (config/devnet.ts)
//   - DEV_MULTISIG populated (Builder A's create-multisig)
//   - DEVNET_AGENTS populated (S-23 register-agents)
//   - wallet has >= 0.05 devnet SOL
//
// Steps:
//   1. preconditions report
//   2. setEncryptedPolicy(walletPubkey, encryptThreshold(9000n))
//   3. subscribe to RebalanceExecutedEvent
//   4. checkThresholdBreach with low drawdown    → breached=false
//   5. checkThresholdBreach with high drawdown   → breached=true (FR-5b cache miss)
//   6. checkThresholdBreach within 5s window     → cached result (FR-5b)
//   7. executePrivateRebalance(action: "EXIT")    → tx + RebalanceExecutedEvent
//   8. executePrivateRebalance again within 30s → cached prior TxSig (FR-8b)
//   9. delegateToGuardian                         → throws NotImplementedError (deferred)
//
// Run: bun run e2e-smoke

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@anchor-lang/core";

import {
  createRealClient,
  encryptThreshold,
  deriveRiskPolicyPda,
  riskPolicyIdl,
  swigDelegationIdl,
  RISK_POLICY_PROGRAM_ID,
  SWIG_DELEGATION_PROGRAM_ID,
  DEV_MULTISIG,
  NotImplementedError,
} from "../packages/onchain/src";
import { RPC_ENDPOINT, DEVNET_AGENTS } from "../config/devnet";

// Demo pacing — small delays make the screen recording readable.
const PACE_MS = Number(process.env.E2E_PACE_MS ?? "800");

function log(msg: string) {
  console.log(`[e2e-smoke] ${msg}`);
}
function explorer(sig: string) {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}
function explorerAcc(addr: string) {
  return `https://explorer.solana.com/address/${addr}?cluster=devnet`;
}
async function pace() {
  if (PACE_MS > 0) await new Promise((r) => setTimeout(r, PACE_MS));
}

class Step {
  constructor(public n: number, public name: string) {}
  pass(detail = "") {
    log(`  ✓ step ${this.n} ${this.name}${detail ? `: ${detail}` : ""}`);
  }
  fail(reason: string): never {
    log(`  ✗ step ${this.n} ${this.name}: ${reason}`);
    process.exit(1);
  }
}

async function main() {
  log("");
  log("══════════════════════════════════════════");
  log("  RiskClaw-Sol — E2E demo smoke");
  log("══════════════════════════════════════════");
  log("");

  // ------------------------------------------------------------------
  // step 1 — preconditions
  // ------------------------------------------------------------------
  const s1 = new Step(1, "preconditions");
  if (!RISK_POLICY_PROGRAM_ID) s1.fail("RISK_POLICY_PROGRAM_ID null — run deploy-devnet");
  if (!SWIG_DELEGATION_PROGRAM_ID) s1.fail("SWIG_DELEGATION_PROGRAM_ID null — run deploy-devnet");
  if (!DEV_MULTISIG) s1.fail("DEV_MULTISIG null — Builder A: bun run create-multisig");
  if (!DEVNET_AGENTS.read || !DEVNET_AGENTS.compute || !DEVNET_AGENTS.execute) {
    s1.fail("DEVNET_AGENTS incomplete — run register-agents");
  }
  const riskPolicyId = RISK_POLICY_PROGRAM_ID!;
  const swigId = SWIG_DELEGATION_PROGRAM_ID!;
  const multisig = DEV_MULTISIG!;

  const conn = new Connection(RPC_ENDPOINT, "confirmed");
  const walletPath = path.join(os.homedir(), ".config/solana/id.json");
  const walletKp = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf8"))),
  );
  const wallet = new anchor.Wallet(walletKp);
  const balance = await conn.getBalance(walletKp.publicKey);
  if (balance < 0.05 * LAMPORTS_PER_SOL) {
    s1.fail(`wallet ${walletKp.publicKey.toBase58()} has only ${balance / LAMPORTS_PER_SOL} SOL`);
  }
  log(`  programs:    risk_policy=${riskPolicyId.toBase58().slice(0, 8)}…  swig_delegation=${swigId.toBase58().slice(0, 8)}…`);
  log(`  multisig:    ${multisig.toBase58()}`);
  log(`  agents:      Observer=${DEVNET_AGENTS.read.mint.slice(0, 8)}…  Analyst=${DEVNET_AGENTS.compute.mint.slice(0, 8)}…  Guardian=${DEVNET_AGENTS.execute.mint.slice(0, 8)}…`);
  log(`  wallet:      ${walletKp.publicKey.toBase58()}  (${(balance / LAMPORTS_PER_SOL).toFixed(3)} SOL)`);
  s1.pass("all green");
  await pace();

  const client = createRealClient({
    connection: conn,
    wallet,
    cluster: "devnet",
    riskPolicyIdl: riskPolicyIdl as never,
    swigDelegationIdl: swigDelegationIdl as never,
  });

  // ------------------------------------------------------------------
  // step 2 — setEncryptedPolicy
  // ------------------------------------------------------------------
  log("");
  const s2 = new Step(2, "setEncryptedPolicy(threshold=9000)");
  const ciphertext = await encryptThreshold(9000n, null);
  const tag = new TextDecoder().decode(ciphertext.slice(48, 64));
  if (tag !== "RISKCLAW_V1_STUB") s2.fail(`expected RISKCLAW_V1_STUB tag, got ${tag}`);
  log(`  ciphertext: 64 bytes; tag=${tag} (v1 placeholder packing per PRD §7 R1)`);

  const setSig = await client.setEncryptedPolicy(walletKp.publicKey, ciphertext);
  const [policyPda] = deriveRiskPolicyPda(walletKp.publicKey);
  s2.pass(`tx ${setSig.slice(0, 16)}…`);
  log(`             ${explorer(setSig)}`);
  log(`  RiskPolicy PDA: ${policyPda.toBase58()}`);
  await pace();

  // ------------------------------------------------------------------
  // step 3 — subscribe to RebalanceExecutedEvent
  // ------------------------------------------------------------------
  log("");
  const s3 = new Step(3, "subscribe to RebalanceExecutedEvent");
  const provider = new anchor.AnchorProvider(conn, wallet, { commitment: "confirmed" });
  const swigProgram = new anchor.Program(swigDelegationIdl as never, provider);
  let capturedEvent: { policy: string; size_bps: number; ts: number } | null = null;
  const listenerId = swigProgram.addEventListener("rebalanceExecutedEvent", (ev: never) => {
    const e = ev as { policy: { toBase58(): string }; sizeBps: number; ts: anchor.BN };
    capturedEvent = {
      policy: e.policy.toBase58(),
      size_bps: e.sizeBps,
      ts: e.ts.toNumber(),
    };
    log(`  📡 RebalanceExecutedEvent received: policy=${capturedEvent.policy.slice(0, 8)}… size=${capturedEvent.size_bps}bps`);
  });
  s3.pass(`listener id=${listenerId}`);
  await pace();

  // ------------------------------------------------------------------
  // step 4 — checkThresholdBreach: low drawdown → false
  // ------------------------------------------------------------------
  log("");
  const s4 = new Step(4, "checkThresholdBreach @ low drawdown");
  const r4 = await client.checkThresholdBreach(policyPda.toBase58(), {
    positionId: policyPda.toBase58(),
    notionalUSD: 9_000,
    drawdownBps: 500,
    liquidityShareBps: 100,
    observedAtUnixMs: Date.now(),
  });
  if (r4.breached !== false) s4.fail(`expected breached=false at drawdown=500bps, got ${r4.breached}`);
  s4.pass(`breached=false (drawdown 500bps < 2500bps threshold)`);
  await pace();

  // Wait out the FR-5b cache window so step 5 actually re-evaluates.
  log("  (waiting 5.2s for FR-5b cache window to expire)");
  await new Promise((r) => setTimeout(r, 5_200));

  // ------------------------------------------------------------------
  // step 5 — checkThresholdBreach: high drawdown → true
  // ------------------------------------------------------------------
  log("");
  const s5 = new Step(5, "checkThresholdBreach @ high drawdown");
  const r5 = await client.checkThresholdBreach(policyPda.toBase58(), {
    positionId: policyPda.toBase58(),
    notionalUSD: 7_500,
    drawdownBps: 3_500,
    liquidityShareBps: 200,
    observedAtUnixMs: Date.now(),
  });
  if (r5.breached !== true) s5.fail(`expected breached=true at drawdown=3500bps, got ${r5.breached}`);
  s5.pass(`breached=true score=${r5.score}`);
  await pace();

  // ------------------------------------------------------------------
  // step 6 — FR-5b: re-call within 5s window returns cached prior result
  // ------------------------------------------------------------------
  log("");
  const s6 = new Step(6, "FR-5b cache hit");
  const r6 = await client.checkThresholdBreach(policyPda.toBase58(), {
    positionId: policyPda.toBase58(),
    notionalUSD: 999_999,        // intentionally different — cache should ignore
    drawdownBps: 100,             // would normally NOT breach
    liquidityShareBps: 0,
    observedAtUnixMs: Date.now(),
  });
  if (r6.breached !== r5.breached || r6.score !== r5.score) {
    s6.fail(`FR-5b broken: expected cached {breached=${r5.breached}, score=${r5.score}}, got {breached=${r6.breached}, score=${r6.score}}`);
  }
  s6.pass("returned cached prior {breached, score} despite new metrics");
  await pace();

  // ------------------------------------------------------------------
  // step 7 — executePrivateRebalance → tx + event
  // ------------------------------------------------------------------
  log("");
  const s7 = new Step(7, "executePrivateRebalance(EXIT, sizeBps=10000)");
  const execSig = await client.executePrivateRebalance({
    positionId: policyPda.toBase58(),
    action: "EXIT",
    sizeBps: 10_000,
  });
  log(`  tx ${execSig.slice(0, 16)}…`);
  log(`     ${explorer(execSig)}`);
  // Wait briefly for the event listener to capture.
  for (let i = 0; i < 10 && !capturedEvent; i++) {
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!capturedEvent) {
    log("  ✗ step 7: RebalanceExecutedEvent never fired within 5s");
    process.exit(1);
  }
  const ev: { policy: string; size_bps: number; ts: number } = capturedEvent;
  if (ev.policy !== policyPda.toBase58()) {
    s7.fail(`event policy mismatch: ${ev.policy} vs ${policyPda.toBase58()}`);
  }
  s7.pass(`event captured: size=${ev.size_bps}bps ts=${ev.ts}`);
  await pace();

  // ------------------------------------------------------------------
  // step 8 — FR-8b: re-call executePrivateRebalance returns prior TxSig
  // ------------------------------------------------------------------
  log("");
  const s8 = new Step(8, "FR-8b idempotency catch");
  const sig2 = await client.executePrivateRebalance({
    positionId: policyPda.toBase58(),
    action: "EXIT",
    sizeBps: 10_000,
  });
  if (sig2 !== execSig) s8.fail(`expected prior TxSig ${execSig.slice(0, 8)}…, got ${sig2.slice(0, 8)}…`);
  s8.pass(`returned cached prior TxSig (no second swap)`);
  await pace();

  // ------------------------------------------------------------------
  // step 9 — delegateToGuardian → NotImplementedError (PRD FR-9 deferred)
  // ------------------------------------------------------------------
  log("");
  const s9 = new Step(9, "delegateToGuardian (deferred Pkg-19)");
  let threwExpected = false;
  try {
    await client.delegateToGuardian(
      walletKp.publicKey,
      walletKp.publicKey,
      {
        maxNotionalUSD: 10_000,
        allowedInstruments: [],
        maxSlippageBps: 100,
        expiresAtUnix: Math.floor(Date.now() / 1000) + 3600,
      },
    );
  } catch (err) {
    if (err instanceof NotImplementedError) threwExpected = true;
  }
  if (!threwExpected) s9.fail("expected NotImplementedError (Pkg-19 deferred)");
  s9.pass("threw NotImplementedError as designed");

  // ------------------------------------------------------------------
  // cleanup + summary
  // ------------------------------------------------------------------
  await swigProgram.removeEventListener(listenerId);

  log("");
  log("══════════════════════════════════════════");
  log("  ALL 9 STEPS PASSED — demo flow live");
  log("══════════════════════════════════════════");
  log(`  setEncryptedPolicy:        ${explorer(setSig)}`);
  log(`  executePrivateRebalance:   ${explorer(execSig)}`);
  log(`  RiskPolicy PDA:            ${explorerAcc(policyPda.toBase58())}`);
  log(`  Multisig:                  ${explorerAcc(multisig.toBase58())}`);
  log(`  Observer agent NFT:        ${explorerAcc(DEVNET_AGENTS.read.mint)}`);
  log(`  Analyst agent NFT:         ${explorerAcc(DEVNET_AGENTS.compute.mint)}`);
  log(`  Guardian agent NFT:        ${explorerAcc(DEVNET_AGENTS.execute.mint)}`);
  log("══════════════════════════════════════════");
}

main().catch((err) => {
  console.error("[e2e-smoke] fatal:", err);
  process.exit(1);
});
