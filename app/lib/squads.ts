// app/lib/squads.ts
// Reads the dev multisig PDA from config/devnet.ts. v1 demo runs against a
// 1-of-1 multisig (operator is also the only signer), so a "proposal" is
// effectively a signed-and-executed tx. The full multisig proposal flow
// lands when Builder B exports buildSetEncryptedPolicyIx.

import { PublicKey } from "@solana/web3.js";
import { DEV_MULTISIG, SQUADS_V4_PROGRAM_ID } from "@config/devnet";

export const SQUADS_PROGRAM_ID = new PublicKey(SQUADS_V4_PROGRAM_ID);

export function getDevMultisig(): PublicKey | null {
  return DEV_MULTISIG ? new PublicKey(DEV_MULTISIG) : null;
}

export function isMultisigConfigured(): boolean {
  return DEV_MULTISIG !== null;
}
