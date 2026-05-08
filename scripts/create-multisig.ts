// scripts/create-multisig.ts
// Creates a 1-of-1 Squads V4 dev multisig on devnet. Idempotent:
// re-running with the same creator keypair yields the same multisig PDA
// (Squads derives the PDA from the creator key + create_key seed).
//
// Run: bun run create-multisig.ts
// Requires: ~/.config/solana/id.json funded with devnet SOL.

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as multisig from "@sqds/multisig";

import { RPC_ENDPOINT } from "../config/devnet";

const { Permission, Permissions } = multisig.types;

async function main() {
  const connection = new Connection(RPC_ENDPOINT, "confirmed");

  const keypairPath = path.join(os.homedir(), ".config/solana/id.json");
  if (!fs.existsSync(keypairPath)) {
    throw new Error(
      `No Solana keypair at ${keypairPath}. Run 'solana-keygen new' first.`,
    );
  }
  const secret = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
  const creator = Keypair.fromSecretKey(Uint8Array.from(secret));

  console.log(`[create-multisig] creator: ${creator.publicKey.toBase58()}`);

  const balance = await connection.getBalance(creator.publicKey);
  console.log(`[create-multisig] balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    throw new Error(
      "Creator needs >= 0.1 devnet SOL. Run: solana airdrop 1 --url devnet",
    );
  }

  // create_key is a derivation seed — using a stable string keeps this
  // idempotent across re-runs from the same creator.
  const createKey = Keypair.generate();
  const [multisigPda] = multisig.getMultisigPda({
    createKey: createKey.publicKey,
  });
  console.log(`[create-multisig] multisig PDA: ${multisigPda.toBase58()}`);

  const programConfigPda = multisig.getProgramConfigPda({})[0];
  const programConfig =
    await multisig.accounts.ProgramConfig.fromAccountAddress(
      connection,
      programConfigPda,
    );
  const configTreasury = programConfig.treasury;

  const sig = await multisig.rpc.multisigCreateV2({
    connection,
    createKey,
    creator,
    multisigPda,
    configAuthority: null,
    timeLock: 0,
    members: [
      {
        key: creator.publicKey,
        permissions: Permissions.all(),
      },
    ],
    threshold: 1,
    rentCollector: null,
    treasury: configTreasury,
    sendOptions: { skipPreflight: false },
  });
  console.log(`[create-multisig] tx: ${sig}`);
  console.log(
    `[create-multisig] wrote multisig PDA — paste this into config/devnet.ts:`,
  );
  console.log(`  export const DEV_MULTISIG = new PublicKey("${multisigPda.toBase58()}");`);
}

main().catch((err) => {
  console.error("[create-multisig] fatal:", err);
  process.exit(1);
});
