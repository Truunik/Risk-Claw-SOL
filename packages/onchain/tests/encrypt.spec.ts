// T-32 — encryptThreshold roundtrip + structural invariants.
// PRD FR-12 + FR-13.
//
// V1 implementation is the documented placeholder packing. Real RescueCipher
// roundtrip lands when MXE_CLUSTER_PUBKEY is non-null.

import { test, expect } from "bun:test";

import { encryptThreshold, _testDecryptPlaceholder } from "../src/encrypt";

test("FR-12: returns exactly 64 bytes", async () => {
  const ct = await encryptThreshold(1_000n, null);
  expect(ct.length).toBe(64);
});

test("FR-12: roundtrip preserves the threshold (placeholder packing)", async () => {
  for (const value of [0n, 1n, 1_000n, 9_000n, (1n << 63n)]) {
    const ct = await encryptThreshold(value, null);
    expect(_testDecryptPlaceholder(ct)).toBe(value);
  }
});

test("FR-13: ciphertext is deterministic per plaintext (v1 placeholder)", async () => {
  // Real RescueCipher would be NON-deterministic (per-call nonce). The v1
  // placeholder is deterministic — this assertion will FLIP when real
  // encryption lands. Document the expected migration.
  const a = await encryptThreshold(9_000n, null);
  const b = await encryptThreshold(9_000n, null);
  expect(a).toEqual(b);
});

test("ciphertext carries the 'RISKCLAW_V1_STUB' tag — auditors can grep on-chain", async () => {
  const ct = await encryptThreshold(1_234n, null);
  const tag = new TextDecoder().decode(ct.slice(48, 64));
  expect(tag).toBe("RISKCLAW_V1_STUB");
});
