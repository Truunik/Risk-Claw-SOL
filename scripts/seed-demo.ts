// scripts/seed-demo.ts
// PRD task S-23b (PRD §2.7).
//
// V1 SCOPE: deterministic preflight + demo-state writer. Original B4 framing
// was "seed an Orca LP into the demo treasury" — that path is gated on the
// real Swig CPI swap (P-11, deferred Q2). Until then, swig_delegation's
// execute_rebalance is a structural stub: it emits the audit event and writes
// the rate-limit timestamp but does NOT broadcast a swap. So a live LP buys
// nothing for the demo today.
//
// What this script DOES ship:
//   1. Verify program IDs + multisig + agent registry are all populated
//   2. Verify the operator wallet has enough devnet SOL (top-up via airdrop
//      if available; loud warning + non-zero exit if faucet declines)
//   3. Print the pinned demo inputs so the operator knows what e2e-smoke
//      will fire — and any drift between this script and e2e-smoke is one
//      file diff away
//
// Why this matters: the demo recording on D9 must be deterministic. Two runs
// that diverge on the threshold value or the drawdown ladder produce two
// different videos. The DEMO_STATE constant below pins them.
//
// Run: bun run seed-demo

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

import {
  RPC_ENDPOINT,
  DEV_MULTISIG,
  DEVNET_AGENTS,
  RISK_POLICY_PROGRAM_ID,
  SWIG_DELEGATION_PROGRAM_ID,
} from "../config/devnet";
import { DEMO_STATE } from "./demo-state";

const MIN_BALANCE_SOL = 0.05;

function log(msg: string) {
  console.log(`[seed-demo] ${msg}`);
}

function checkPopulated(label: string, value: string | null): asserts value is string {
  if (!value) {
    log(`✗ ${label} is null in config/devnet.ts — aborting`);
    process.exit(1);
  }
}

async function topUpIfNeeded(
  conn: Connection,
  walletKp: Keypair,
): Promise<{ before: number; after: number; airdropped: boolean }> {
  const before = await conn.getBalance(walletKp.publicKey);
  const beforeSol = before / LAMPORTS_PER_SOL;
  if (beforeSol >= MIN_BALANCE_SOL) {
    return { before: beforeSol, after: beforeSol, airdropped: false };
  }
  log(`  wallet has ${beforeSol.toFixed(4)} SOL < ${MIN_BALANCE_SOL} SOL — requesting airdrop`);
  try {
    const sig = await conn.requestAirdrop(walletKp.publicKey, 1 * LAMPORTS_PER_SOL);
    await conn.confirmTransaction(sig, "confirmed");
  } catch (err) {
    log(`  ✗ airdrop failed: ${(err as Error).message}`);
    log(`    fund manually: solana airdrop 1 ${walletKp.publicKey.toBase58()} --url devnet`);
    process.exit(1);
  }
  const after = await conn.getBalance(walletKp.publicKey);
  return {
    before: beforeSol,
    after: after / LAMPORTS_PER_SOL,
    airdropped: true,
  };
}

async function main() {
  log("");
  log("═══ S-23b — demo-state seed ═══");

  // 1. Config preflight.
  log("");
  log("1) config/devnet.ts preflight");
  checkPopulated("RISK_POLICY_PROGRAM_ID", RISK_POLICY_PROGRAM_ID);
  checkPopulated("SWIG_DELEGATION_PROGRAM_ID", SWIG_DELEGATION_PROGRAM_ID);
  checkPopulated("DEV_MULTISIG", DEV_MULTISIG);
  for (const zone of ["read", "compute", "execute"] as const) {
    if (!DEVNET_AGENTS[zone]) {
      log(`✗ DEVNET_AGENTS["${zone}"] missing — run register-agents`);
      process.exit(1);
    }
  }
  log(`  ✓ programs:  risk_policy=${RISK_POLICY_PROGRAM_ID.slice(0, 8)}…  swig_delegation=${SWIG_DELEGATION_PROGRAM_ID.slice(0, 8)}…`);
  log(`  ✓ multisig:  ${DEV_MULTISIG}`);
  log(`  ✓ agents:    Observer/Analyst/Guardian all registered on devnet`);

  // PublicKey parse-check — surfaces malformed entries early.
  new PublicKey(RISK_POLICY_PROGRAM_ID);
  new PublicKey(SWIG_DELEGATION_PROGRAM_ID);
  new PublicKey(DEV_MULTISIG);
  for (const zone of ["read", "compute", "execute"] as const) {
    new PublicKey(DEVNET_AGENTS[zone].mint);
    new PublicKey(DEVNET_AGENTS[zone].pubkey);
  }

  // 2. Wallet balance preflight.
  log("");
  log("2) wallet balance preflight");
  const conn = new Connection(RPC_ENDPOINT, "confirmed");
  const walletPath = path.join(os.homedir(), ".config/solana/id.json");
  if (!fs.existsSync(walletPath)) {
    log(`✗ wallet not found at ${walletPath} — run \`solana-keygen new\``);
    process.exit(1);
  }
  const walletSecret = JSON.parse(fs.readFileSync(walletPath, "utf8"));
  const walletKp = Keypair.fromSecretKey(Uint8Array.from(walletSecret));
  const { before, after, airdropped } = await topUpIfNeeded(conn, walletKp);
  log(
    `  ✓ ${walletKp.publicKey.toBase58().slice(0, 8)}…  ${before.toFixed(4)} → ${after.toFixed(4)} SOL` +
      (airdropped ? "  (airdropped)" : ""),
  );

  // 3. Print pinned demo inputs.
  log("");
  log("3) pinned demo inputs (DEMO_STATE)");
  log(`  threshold:  ${DEMO_STATE.thresholdPlaintext} (encoded with RISKCLAW_V1_STUB tag)`);
  for (const stage of DEMO_STATE.metricsLadder) {
    const expected = stage.drawdownBps >= 2_500 ? "BREACH" : "no breach";
    log(`  ladder:     drawdown=${stage.drawdownBps}bps  notional=$${stage.notionalUSD}  → ${expected}  (${stage.label})`);
  }
  log(`  rebalance:  action=${DEMO_STATE.rebalance.action}  sizeBps=${DEMO_STATE.rebalance.sizeBps}`);

  log("");
  log("═══ S-23b done — demo state pinned ═══");
  log("Next: `bun run e2e-smoke` walks the demo against this state.");
}

main().catch((err) => {
  console.error("[seed-demo] fatal:", err);
  process.exit(1);
});
