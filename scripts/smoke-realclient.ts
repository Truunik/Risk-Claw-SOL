// scripts/smoke-realclient.ts
//
// Integration smoke test for @riskclaw/onchain.RealClient against the
// deployed devnet programs. Closes the gap between "isolated unit tests
// pass" and "end-to-end integration works."
//
// Steps:
//   1. setEncryptedPolicy(walletPubkey, encryptThreshold(9000n))
//      → risk_policy::init_policy
//      → verify RiskPolicy PDA exists on-chain with our ciphertext
//   2. executePrivateRebalance({positionId: policyPda, action: "EXIT", sizeBps: 5000})
//      → swig_delegation::execute_rebalance
//      → verify RebalanceExecutedEvent (via balance/account changes)
//   3. Re-execute → verify FR-8b client-side throttle returns prior TxSig
//
// Run: bun run scripts/smoke-realclient.ts

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as anchor from "@anchor-lang/core";

import {
  createRealClient,
  encryptThreshold,
  deriveRiskPolicyPda,
  deriveLastRebalancedPda,
  RISK_POLICY_PROGRAM_ID,
  SWIG_DELEGATION_PROGRAM_ID,
} from "../packages/onchain/src";
import { RPC_ENDPOINT } from "../config/devnet";

const REPO_ROOT = path.resolve(__dirname, "..");
const RISK_POLICY_IDL = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, "programs/target/idl/risk_policy.json"), "utf8"),
) as anchor.Idl;
const SWIG_IDL = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, "programs/target/idl/swig_delegation.json"), "utf8"),
) as anchor.Idl;

function log(msg: string) {
  console.log(`[smoke] ${msg}`);
}
function explorer(sig: string) {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}
function explorerAcc(addr: string) {
  return `https://explorer.solana.com/address/${addr}?cluster=devnet`;
}

async function main() {
  if (!RISK_POLICY_PROGRAM_ID || !SWIG_DELEGATION_PROGRAM_ID) {
    throw new Error("Program IDs not set in config/devnet.ts — run deploy-devnet first");
  }

  const connection = new Connection(RPC_ENDPOINT, "confirmed");
  const keypairPath = path.join(os.homedir(), ".config/solana/id.json");
  const secret = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
  const walletKp = Keypair.fromSecretKey(Uint8Array.from(secret));
  const wallet = new anchor.Wallet(walletKp);
  log(`wallet: ${walletKp.publicKey.toBase58()}`);

  const balance = await connection.getBalance(walletKp.publicKey);
  log(`balance: ${(balance / LAMPORTS_PER_SOL).toFixed(3)} SOL`);
  if (balance < 0.05 * LAMPORTS_PER_SOL) {
    throw new Error("wallet needs >= 0.05 SOL for two txs");
  }

  const client = createRealClient({
    connection,
    wallet,
    cluster: "devnet",
    riskPolicyIdl: RISK_POLICY_IDL,
    swigDelegationIdl: SWIG_IDL,
  });

  // --------- step 1: setEncryptedPolicy ---------
  log("");
  log("═══ step 1: setEncryptedPolicy ═══");
  // V1 demo path: our wallet plays the role of the multisig vault.
  // In production this is a Squads V4 vault PDA.
  const ciphertext = await encryptThreshold(9000n, null);
  log(`ciphertext: ${ciphertext.length} bytes (RISKCLAW_V1_STUB tag at [48..64])`);
  const [expectedPolicyPda] = deriveRiskPolicyPda(walletKp.publicKey);
  log(`expected RiskPolicy PDA: ${expectedPolicyPda.toBase58()}`);

  let setSig: string;
  try {
    setSig = await client.setEncryptedPolicy(walletKp.publicKey, ciphertext);
    log(`✓ setEncryptedPolicy tx: ${setSig}`);
    log(`  ${explorer(setSig)}`);
  } catch (err) {
    log(`✗ setEncryptedPolicy FAILED:`);
    console.error(err);
    process.exit(1);
  }

  // Verify PDA exists with the right discriminator + ciphertext
  const policyAccount = await connection.getAccountInfo(expectedPolicyPda);
  if (!policyAccount) {
    log(`✗ RiskPolicy PDA not found at ${expectedPolicyPda.toBase58()}`);
    process.exit(1);
  }
  log(`✓ RiskPolicy PDA exists: ${policyAccount.data.length} bytes`);
  log(`  ${explorerAcc(expectedPolicyPda.toBase58())}`);

  // Decode and verify ciphertext_ref by parsing the account bytes manually.
  // Layout: 8 (disc) + 32 (vault) + 64 (ciphertext_ref) + ...
  const onChainCiphertext = policyAccount.data.slice(8 + 32, 8 + 32 + 64);
  const ciphertextMatches = Buffer.from(onChainCiphertext).equals(Buffer.from(ciphertext));
  if (!ciphertextMatches) {
    log(`✗ ciphertext mismatch: on-chain bytes don't match what we submitted`);
    process.exit(1);
  }
  log(`✓ ciphertext bytes match on-chain`);

  // --------- step 2: executePrivateRebalance ---------
  log("");
  log("═══ step 2: executePrivateRebalance ═══");
  const [lrPda] = deriveLastRebalancedPda(expectedPolicyPda);
  log(`expected LastRebalanced PDA: ${lrPda.toBase58()}`);

  let execSig: string;
  try {
    execSig = await client.executePrivateRebalance({
      positionId: expectedPolicyPda.toBase58(),
      action: "EXIT",
      sizeBps: 5_000,
    });
    log(`✓ executePrivateRebalance tx: ${execSig}`);
    log(`  ${explorer(execSig)}`);
  } catch (err) {
    log(`✗ executePrivateRebalance FAILED:`);
    console.error(err);
    process.exit(1);
  }

  const lrAccount = await connection.getAccountInfo(lrPda);
  if (!lrAccount) {
    log(`✗ LastRebalanced PDA not found at ${lrPda.toBase58()}`);
    process.exit(1);
  }
  log(`✓ LastRebalanced PDA exists: ${lrAccount.data.length} bytes`);
  // Layout: 8 (disc) + 8 (timestamp i64 LE) + 1 (bump)
  const ts = Number(new DataView(lrAccount.data.buffer, lrAccount.data.byteOffset + 8, 8).getBigInt64(0, true));
  log(`✓ last_rebalanced.timestamp = ${ts} (${new Date(ts * 1000).toISOString()})`);

  // --------- step 3: FR-8b client-side throttle ---------
  log("");
  log("═══ step 3: re-execute → FR-8b returns prior TxSig (no new tx) ═══");
  const sig2 = await client.executePrivateRebalance({
    positionId: expectedPolicyPda.toBase58(),
    action: "EXIT",
    sizeBps: 5_000,
  });
  if (sig2 !== execSig) {
    log(`✗ FR-8b broken: expected prior TxSig ${execSig.slice(0, 8)}…, got ${sig2.slice(0, 8)}…`);
    process.exit(1);
  }
  log(`✓ FR-8b: client returned cached TxSig ${execSig.slice(0, 8)}… (no new RPC submission)`);

  // --------- summary ---------
  log("");
  log("═══════════════════════════════════════");
  log("ALL THREE STEPS PASSED — integration green");
  log(`  setEncryptedPolicy:        ${explorer(setSig)}`);
  log(`  executePrivateRebalance:   ${explorer(execSig)}`);
  log(`  RiskPolicy PDA:            ${explorerAcc(expectedPolicyPda.toBase58())}`);
  log(`  LastRebalanced PDA:        ${explorerAcc(lrPda.toBase58())}`);
  log("═══════════════════════════════════════");
}

main().catch((err) => {
  console.error("[smoke] fatal:", err);
  process.exit(1);
});
