// scripts/register-agents.ts
// PRD task S-23 (PRD §2.5).
//
// Mints three Metaplex Core NFTs on devnet — one per agent zone (read /
// compute / execute) — to serve as auditable on-chain identities for
// Observer / Analyst / Guardian. The audit trail viewer at /app/audit
// resolves each agent's tx signer to their Core asset's owner pubkey.
//
// Idempotent: re-runs read scripts/devnet-registry.json + verify each
// asset is alive on-chain; skip already-minted entries.
//
// Run: bun run register-agents
// Requires: ~/.config/solana/id.json funded with >= 0.05 devnet SOL
//           (~0.005 SOL per Core mint).

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  generateSigner,
  keypairIdentity,
  publicKey as umiPublicKey,
} from "@metaplex-foundation/umi";
import { create, mplCore, fetchAssetV1 } from "@metaplex-foundation/mpl-core";

import { RPC_ENDPOINT } from "../config/devnet";

const REPO_ROOT = path.resolve(__dirname, "..");
const KEYS_DIR = path.join(__dirname, ".keys");
const REGISTRY_PATH = path.join(__dirname, "devnet-registry.json");
const CONFIG_PATH = path.join(REPO_ROOT, "config", "devnet.ts");

// Three zones, fixed per PRD §1 + §2.5 + §11. Each is one Core NFT.
const ZONES = [
  { zone: "read",    name: "Observer", file: "observer.json" },
  { zone: "compute", name: "Analyst",  file: "analyst.json"  },
  { zone: "execute", name: "Guardian", file: "guardian.json" },
] as const;

type Registry = {
  [zone: string]: { mint: string; pubkey: string; name: string };
};

function log(msg: string) {
  console.log(`[register-agents] ${msg}`);
}
function explorerAcc(addr: string) {
  return `https://explorer.solana.com/address/${addr}?cluster=devnet`;
}

function loadOrCreateZoneKeypair(file: string): Keypair {
  if (!fs.existsSync(KEYS_DIR)) fs.mkdirSync(KEYS_DIR, { recursive: true });
  const p = path.join(KEYS_DIR, file);
  if (fs.existsSync(p)) {
    const secret = JSON.parse(fs.readFileSync(p, "utf8"));
    return Keypair.fromSecretKey(Uint8Array.from(secret));
  }
  const kp = Keypair.generate();
  fs.writeFileSync(p, JSON.stringify(Array.from(kp.secretKey)), "utf8");
  log(`  generated new keypair → ${p}`);
  return kp;
}

function loadRegistry(): Registry {
  if (!fs.existsSync(REGISTRY_PATH)) return {};
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8")) as Registry;
}
function saveRegistry(r: Registry) {
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(r, null, 2), "utf8");
}

function patchConfig(registry: Registry): void {
  const before = fs.readFileSync(CONFIG_PATH, "utf8");
  const block = `export const DEVNET_AGENTS: { [zone: string]: { mint: string; pubkey: string; name: string } } = ${JSON.stringify(
    registry,
    null,
    2,
  )};`;

  // Match from `export const DEVNET_AGENTS:` through the FIRST `};` that's
  // at the start of its own line. The type signature contains intra-line
  // `;` chars, so we anchor on the line-start `};` to avoid stopping early.
  // `[\s\S]*?` is the dotall non-greedy trick (TS regex `.` doesn't match
  // newlines without /s flag).
  const blockRegex = /export const DEVNET_AGENTS:[\s\S]*?\n};(\r?\n|$)/;
  const hasExistingBlock = blockRegex.test(before);

  let after: string;
  if (hasExistingBlock) {
    after = before.replace(blockRegex, block + "\n");
  } else if (/export const DEVNET_AGENTS:/.test(before)) {
    // The export string is present but our regex didn't match the full
    // block — file shape diverged; fail loudly so we don't silently corrupt.
    throw new Error(
      "DEVNET_AGENTS line found but block regex didn't match — config/devnet.ts shape changed; update the patcher",
    );
  } else {
    // Append at end of file.
    after = before.trimEnd() + "\n\n" + block + "\n";
  }

  // Idempotency: skip the write if nothing actually changed.
  if (before === after) {
    log(`  config/devnet.ts already up-to-date (no-op)`);
    return;
  }
  fs.writeFileSync(CONFIG_PATH, after, "utf8");
  log(`  wrote DEVNET_AGENTS into ${CONFIG_PATH}`);
}

async function main() {
  // Wallet preflight.
  const walletPath = path.join(os.homedir(), ".config/solana/id.json");
  const walletSecret = JSON.parse(fs.readFileSync(walletPath, "utf8"));
  const walletKp = Keypair.fromSecretKey(Uint8Array.from(walletSecret));

  const conn = new Connection(RPC_ENDPOINT, "confirmed");
  const balance = await conn.getBalance(walletKp.publicKey);
  log(`wallet:  ${walletKp.publicKey.toBase58()}`);
  log(`balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL on devnet`);
  if (balance < 0.05 * LAMPORTS_PER_SOL) {
    throw new Error("wallet needs >= 0.05 devnet SOL for three Core mints");
  }

  // Umi setup. Update authority = our wallet so we can rotate / re-mint later.
  const umi = createUmi(RPC_ENDPOINT).use(mplCore());
  umi.use(
    keypairIdentity(
      umi.eddsa.createKeypairFromSecretKey(Uint8Array.from(walletSecret)),
    ),
  );

  const registry = loadRegistry();

  for (const z of ZONES) {
    log("");
    log(`── ${z.name} (zone="${z.zone}") ──`);

    const owner = loadOrCreateZoneKeypair(z.file);
    log(`  owner:  ${owner.publicKey.toBase58()}`);

    // Idempotency: if registry has this zone AND the asset exists on-chain
    // with the right owner, skip the mint.
    const existing = registry[z.zone];
    if (existing) {
      try {
        const asset = await fetchAssetV1(umi, umiPublicKey(existing.mint));
        if (asset.owner.toString() === owner.publicKey.toBase58()) {
          log(`  ✓ already minted: ${existing.mint}`);
          log(`    ${explorerAcc(existing.mint)}`);
          continue;
        }
        log(`  registry mint ${existing.mint} owner mismatch — re-minting`);
      } catch {
        log(`  registry mint ${existing.mint} not on-chain — re-minting`);
      }
    }

    // Fresh mint.
    const asset = generateSigner(umi);
    const builder = create(umi, {
      asset,
      name: z.name,
      uri: `https://riskclaw.demo/agents/${z.zone}.json`,
      owner: umiPublicKey(owner.publicKey.toBase58()),
      plugins: [
        {
          type: "Attributes",
          attributeList: [
            { key: "zone", value: z.zone },
            { key: "agent_pubkey", value: owner.publicKey.toBase58() },
            { key: "version", value: "1" },
          ],
        },
      ],
    });
    const result = await builder.sendAndConfirm(umi);
    const txSig = Buffer.from(result.signature).toString("base64");

    registry[z.zone] = {
      mint: asset.publicKey,
      pubkey: owner.publicKey.toBase58(),
      name: z.name,
    };
    saveRegistry(registry);
    log(`  ✓ minted Core asset: ${asset.publicKey}`);
    log(`    tx (b64 sig): ${txSig.slice(0, 24)}…`);
    log(`    ${explorerAcc(asset.publicKey)}`);
  }

  log("");
  log("═══ patching config/devnet.ts with DEVNET_AGENTS ═══");
  patchConfig(registry);

  log("");
  log("═══════════════════════════════════════");
  log("S-23 done. Three agent identities live:");
  for (const z of ZONES) {
    const r = registry[z.zone];
    log(`  ${z.name.padEnd(8)} mint=${r.mint}  owner=${r.pubkey}`);
  }
  log("═══════════════════════════════════════");
}

main().catch((err) => {
  console.error("[register-agents] fatal:", err);
  process.exit(1);
});
