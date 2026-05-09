import { PublicKey } from "@solana/web3.js";

// Re-export devnet program IDs as PublicKey instances. Source-of-truth
// strings live in the repo's `config/devnet.ts` so both Builder A's app
// and this package stay aligned.

import {
  DEV_MULTISIG as DEV_MULTISIG_STR,
  RISK_POLICY_PROGRAM_ID as RISK_POLICY_PROGRAM_ID_STR,
  SQUADS_V4_PROGRAM_ID as SQUADS_V4_PROGRAM_ID_STR,
  SWIG_DELEGATION_PROGRAM_ID as SWIG_DELEGATION_PROGRAM_ID_STR,
} from "../../../config/devnet";

/** Squads V4 program ID (mainnet ≡ devnet). */
export const SQUADS_V4_PROGRAM_ID: PublicKey = new PublicKey(SQUADS_V4_PROGRAM_ID_STR);

/** RiskPolicy program ID — populated by `scripts/deploy-devnet.ts` (S-24). */
export const RISK_POLICY_PROGRAM_ID: PublicKey | null =
  RISK_POLICY_PROGRAM_ID_STR ? new PublicKey(RISK_POLICY_PROGRAM_ID_STR) : null;

/** SwigDelegation program ID — populated by `scripts/deploy-devnet.ts` (S-24). */
export const SWIG_DELEGATION_PROGRAM_ID: PublicKey | null =
  SWIG_DELEGATION_PROGRAM_ID_STR ? new PublicKey(SWIG_DELEGATION_PROGRAM_ID_STR) : null;

/** Dev multisig vault PDA — populated by `scripts/create-multisig.ts` (Builder A). */
export const DEV_MULTISIG: PublicKey | null =
  DEV_MULTISIG_STR ? new PublicKey(DEV_MULTISIG_STR) : null;

/** Seed for `RiskPolicy` PDA: [b"policy", owning_multisig_vault]. */
export const RISK_POLICY_SEED = Buffer.from("policy");

/** Seed for `LastRebalanced` PDA: [b"last_rebalanced", policy.key()]. */
export const LAST_REBALANCED_SEED = Buffer.from("last_rebalanced");

/**
 * Derive the RiskPolicy PDA owned by a Squads vault.
 * Matches `programs/risk_policy/src/state.rs::RiskPolicy::SEED`.
 */
export function deriveRiskPolicyPda(vaultPubkey: PublicKey): [PublicKey, number] {
  if (!RISK_POLICY_PROGRAM_ID) {
    throw new Error("RISK_POLICY_PROGRAM_ID not set in config/devnet.ts — run deploy-devnet.ts first");
  }
  return PublicKey.findProgramAddressSync(
    [RISK_POLICY_SEED, vaultPubkey.toBuffer()],
    RISK_POLICY_PROGRAM_ID,
  );
}

/**
 * Derive the LastRebalanced PDA bound to a RiskPolicy.
 * Matches `programs/swig_delegation/src/state.rs::LastRebalanced::SEED`.
 */
export function deriveLastRebalancedPda(policyPubkey: PublicKey): [PublicKey, number] {
  if (!SWIG_DELEGATION_PROGRAM_ID) {
    throw new Error("SWIG_DELEGATION_PROGRAM_ID not set in config/devnet.ts — run deploy-devnet.ts first");
  }
  return PublicKey.findProgramAddressSync(
    [LAST_REBALANCED_SEED, policyPubkey.toBuffer()],
    SWIG_DELEGATION_PROGRAM_ID,
  );
}
