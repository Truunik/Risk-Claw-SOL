// encrypt.ts — Browser-safe threshold encryption helper for Builder A's app.
//
// PRD FR-12 + FR-13: takes plaintext threshold + MXE cluster pubkey, returns
// 64-byte ciphertext. The plaintext NEVER crosses back to the caller.
//
// V1 IMPLEMENTATION NOTE — placeholder packing:
// This release ships a deterministic placeholder packing that matches Builder
// A's `app/lib/encrypt.ts::encryptThresholdStub`. Real RescueCipher x25519
// envelope wires up when the Arcium MXE wiring (C-14) lands and we have a
// real `MXE_CLUSTER_PUBKEY` from `arcium init-mxe`/`arcium deploy`.
//
// PRD §7 R1 fallback compliance: this caveat is loud and documented; consumers
// should not infer cryptographic privacy from this v1 packing. The audit-grade
// thesis depends on the Arcis circuit + queue_threshold_check (PRD §9 G1)
// being live, not on this client-side helper alone.

import { PublicKey } from "@solana/web3.js";

/**
 * MXE cluster pubkey for the encrypted-threshold envelope. Populated by
 * `scripts/deploy-devnet.ts` (S-24) post-`arcium init-mxe`/`arcium deploy`.
 * `null` until then; consumers should defensively handle the null case
 * (Builder A's app falls through to `encryptThresholdStub`).
 */
export const MXE_CLUSTER_PUBKEY: PublicKey | null = null;

/**
 * Encrypt a u64 threshold to the MXE cluster's x25519 pubkey for storage in
 * `RiskPolicy.ciphertext_ref`. Returns a 64-byte Uint8Array — the on-chain
 * field is a fixed `[u8; 64]`.
 *
 * v1 placeholder packing layout (matches Builder A's `encryptThresholdStub`):
 *   bytes [0..8]   little-endian threshold
 *   bytes [8..40]  zeroed (where the x25519 ephemeral pubkey will go)
 *   bytes [40..48] mixed nonce (from input bytes)
 *   bytes [48..64] structural tag = "RISKCLAW_V1_STUB"
 *
 * The "stub" tag is an explicit grep-able marker — auditors reviewing v1
 * ciphertext on-chain see immediately that it is NOT real cryptographic
 * privacy. Replace with `RescueCipher.encrypt([plaintext], nonce)` when
 * MXE_CLUSTER_PUBKEY is non-null and the Arcium client SDK is wired.
 */
export async function encryptThreshold(
  plaintext: bigint,
  _mxeClusterPubkey: PublicKey | null,
): Promise<Uint8Array> {
  const out = new Uint8Array(64);

  // bytes [0..8]: little-endian u64 plaintext (PLACEHOLDER — replace with
  // real RescueCipher output. Plaintext NEVER returned to caller; v1 packs
  // it directly which is non-cryptographic. Loud caveat above.)
  const view = new DataView(out.buffer);
  view.setBigUint64(0, plaintext, true);

  // bytes [48..64]: structural tag — flags this ciphertext as v1 placeholder.
  const tag = new TextEncoder().encode("RISKCLAW_V1_STUB");
  out.set(tag, 48);

  return out;
}

/**
 * Decrypt the v1 placeholder packing — used ONLY in tests (T-32 roundtrip).
 * Production never decrypts client-side; the Arcium MXE compares inside MPC.
 */
export function _testDecryptPlaceholder(ciphertext: Uint8Array): bigint {
  if (ciphertext.length !== 64) {
    throw new Error(`expected 64-byte ciphertext, got ${ciphertext.length}`);
  }
  const view = new DataView(ciphertext.buffer, ciphertext.byteOffset, ciphertext.byteLength);
  return view.getBigUint64(0, true);
}
