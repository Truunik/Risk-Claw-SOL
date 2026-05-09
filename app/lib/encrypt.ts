// app/lib/encrypt.ts
// Placeholder threshold "encryption" used by the policy editor until Builder B
// exports the real Arcium client (MXE_CLUSTER_PUBKEY + RescueCipher x25519
// envelope) from @riskclaw/onchain.
//
// PRD §9 invariant — the *real* encrypt path must never log the plaintext and
// must produce a 64-byte ciphertext. The stub below packs JSON into a
// 64-byte buffer so the UI flow exercises the right shape, but it is NOT
// secret. Replace before any pitch that claims privacy.

export type PolicyDraft = {
  drawdownBps: number;
  maxNotionalUSD: number;
  maxSlippageBps: number;
  expiresAtUnix: number;
};

export function encryptThresholdStub(draft: PolicyDraft): Uint8Array {
  const payload = new TextEncoder().encode(JSON.stringify(draft));
  const buf = new Uint8Array(64);
  buf.set(payload.subarray(0, Math.min(64, payload.byteLength)));
  return buf;
}
