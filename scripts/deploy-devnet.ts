// scripts/deploy-devnet.ts
// PRD task S-24 (S §2.6).
//
// Deploys risk_policy + swig_delegation Anchor programs to Solana devnet,
// then writes the resulting program IDs into ../config/devnet.ts so both
// Builder A's app and @riskclaw/onchain pick them up automatically.
//
// Idempotent: if both program IDs are already non-null in config/devnet.ts,
// reports "already deployed" and exits 0 without redeploying. Anchor's
// `keys sync` reuses any existing keypair under target/deploy/, so re-running
// is also safe — it just bumps the deployed program data with the new build.
//
// Run:
//   bun run deploy-devnet
// or with --dry-run to print the plan without executing:
//   bun run deploy-devnet -- --dry-run
//
// Requires:
//   ~/.config/solana/id.json funded with >= 4 devnet SOL
//   anchor 1.0.2 + solana 3.x in PATH (see Stream F-1)

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

import {
  RPC_ENDPOINT,
  RISK_POLICY_PROGRAM_ID as EXISTING_RISK_POLICY_ID,
  SWIG_DELEGATION_PROGRAM_ID as EXISTING_SWIG_ID,
} from "../config/devnet";

const REPO_ROOT = path.resolve(__dirname, "..");
const PROGRAMS_DIR = path.join(REPO_ROOT, "programs");
const CONFIG_PATH = path.join(REPO_ROOT, "config", "devnet.ts");
const DRY_RUN = process.argv.includes("--dry-run");

function log(msg: string) {
  console.log(`[deploy-devnet] ${msg}`);
}

function sh(cmd: string, opts: { cwd?: string } = {}): string {
  log(`$ ${cmd}${opts.cwd ? `  (cwd=${opts.cwd})` : ""}`);
  if (DRY_RUN) {
    log("(dry-run — skipped)");
    return "";
  }
  return execSync(cmd, {
    cwd: opts.cwd ?? REPO_ROOT,
    stdio: ["inherit", "pipe", "inherit"],
    encoding: "utf8",
  });
}

function readKeypairPubkey(file: string): string {
  if (!fs.existsSync(file)) {
    throw new Error(`expected keypair at ${file}; did anchor build/keys sync run?`);
  }
  const out = execSync(`solana-keygen pubkey ${file}`, { encoding: "utf8" });
  return out.trim();
}

function patchConfig(programIds: { riskPolicy: string; swigDelegation: string }): void {
  const before = fs.readFileSync(CONFIG_PATH, "utf8");
  const after = before
    .replace(
      /export const RISK_POLICY_PROGRAM_ID:[^;]+;/,
      `export const RISK_POLICY_PROGRAM_ID: string | null = "${programIds.riskPolicy}";`,
    )
    .replace(
      /export const SWIG_DELEGATION_PROGRAM_ID:[^;]+;/,
      `export const SWIG_DELEGATION_PROGRAM_ID: string | null = "${programIds.swigDelegation}";`,
    );
  if (before === after) {
    log("WARNING: config/devnet.ts unchanged after regex — verify the export lines match the patch pattern");
  }
  if (DRY_RUN) {
    log("(dry-run — would write config/devnet.ts with the new IDs)");
    return;
  }
  fs.writeFileSync(CONFIG_PATH, after, "utf8");
  log(`wrote ${CONFIG_PATH}`);
}

async function main() {
  log(`mode: ${DRY_RUN ? "DRY RUN" : "DEPLOY"}`);

  // Idempotency check — skip the heavy lift if both IDs are already populated.
  if (EXISTING_RISK_POLICY_ID && EXISTING_SWIG_ID) {
    log(`already deployed:`);
    log(`  RISK_POLICY_PROGRAM_ID    = ${EXISTING_RISK_POLICY_ID}`);
    log(`  SWIG_DELEGATION_PROGRAM_ID = ${EXISTING_SWIG_ID}`);
    log(`(re-run with --force to redeploy; not implemented in v1)`);
    return;
  }

  // Wallet + balance preflight.
  const keypairPath = path.join(os.homedir(), ".config/solana/id.json");
  if (!fs.existsSync(keypairPath)) {
    throw new Error(`No Solana keypair at ${keypairPath}. Run: solana-keygen new`);
  }
  const secret = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(secret));
  log(`wallet: ${wallet.publicKey.toBase58()}`);

  const connection = new Connection(RPC_ENDPOINT, "confirmed");
  const balance = await connection.getBalance(wallet.publicKey);
  log(`balance: ${(balance / LAMPORTS_PER_SOL).toFixed(3)} SOL on devnet`);
  if (!DRY_RUN && balance < 4 * LAMPORTS_PER_SOL) {
    throw new Error(
      `wallet needs >= 4 devnet SOL for two program deploys. Run: solana airdrop 2 --url devnet (twice if rate-limited)`,
    );
  }

  // Make sure the Solana CLI is on devnet so anchor deploy targets the right cluster.
  sh(`solana config set --url ${RPC_ENDPOINT}`);

  // Build + sync keys + deploy.
  sh("anchor build", { cwd: PROGRAMS_DIR });
  sh("anchor keys sync", { cwd: PROGRAMS_DIR });
  sh("anchor build", { cwd: PROGRAMS_DIR }); // rebuild after keys sync may have rotated declare_id
  sh("anchor deploy --provider.cluster devnet", { cwd: PROGRAMS_DIR });

  // Read deployed program IDs from the keypair files Anchor wrote.
  const riskPolicyKp = path.join(PROGRAMS_DIR, "target/deploy/risk_policy-keypair.json");
  const swigKp = path.join(PROGRAMS_DIR, "target/deploy/swig_delegation-keypair.json");
  const programIds = {
    riskPolicy: DRY_RUN ? "<DRY_RUN_RISK_POLICY_ID>" : readKeypairPubkey(riskPolicyKp),
    swigDelegation: DRY_RUN ? "<DRY_RUN_SWIG_ID>" : readKeypairPubkey(swigKp),
  };
  log(`deployed:`);
  log(`  risk_policy      = ${programIds.riskPolicy}`);
  log(`  swig_delegation  = ${programIds.swigDelegation}`);

  // Persist into config/devnet.ts.
  patchConfig(programIds);

  log(`done. Builder A's app + @riskclaw/onchain now resolve real program IDs.`);
}

main().catch((err) => {
  console.error("[deploy-devnet] fatal:", err);
  process.exit(1);
});
