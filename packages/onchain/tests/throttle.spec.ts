// T-31b — FR-5b read throttle cache + FR-8b write idempotency catch.
// Tests pure-TS behavior; no Solana validator, no MXE, no Docker.
// PRD §8 AC-12 (read cache) + AC-13 client side.

import { test, expect, beforeEach } from "bun:test";
import { Connection, Keypair } from "@solana/web3.js";

import { createRealClient } from "../src/client";

function makeClient(opts: { readThrottleMs?: number; writeThrottleMs?: number } = {}) {
  // No-op connection — we only test the in-memory cache behavior.
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  const wallet = {
    publicKey: Keypair.generate().publicKey,
    signTransaction: async (tx: never) => tx,
    signAllTransactions: async (txs: never[]) => txs,
    payer: Keypair.generate(),
  } as never;
  return createRealClient({
    connection,
    wallet,
    cluster: "devnet",
    readThrottleMs: opts.readThrottleMs ?? 5_000,
    writeThrottleMs: opts.writeThrottleMs ?? 30_000,
  });
}

const baseMetrics = {
  positionId: "pos-1",
  notionalUSD: 9_000,
  drawdownBps: 0,
  liquidityShareBps: 0,
  observedAtUnixMs: 0,
};

test("AC-12: FR-5b read cache returns prior result within throttle window", async () => {
  const client = makeClient({ readThrottleMs: 5_000 });

  // First call — drawdown low, breached=false. Cached.
  const r1 = await client.checkThresholdBreach("pos-1", { ...baseMetrics, drawdownBps: 100 });
  expect(r1.breached).toBe(false);

  // Second call within 5s with HIGHER drawdown that would normally breach —
  // cache should override and return the prior (false) result.
  const r2 = await client.checkThresholdBreach("pos-1", { ...baseMetrics, drawdownBps: 5_000 });
  expect(r2.breached).toBe(false);
  expect(r2).toEqual(r1);
});

test("AC-12: cache misses for distinct positions", async () => {
  const client = makeClient({ readThrottleMs: 5_000 });

  const r1 = await client.checkThresholdBreach("pos-1", { ...baseMetrics, drawdownBps: 5_000 });
  const r2 = await client.checkThresholdBreach("pos-2", { ...baseMetrics, drawdownBps: 100 });

  expect(r1.breached).toBe(true);
  expect(r2.breached).toBe(false);
});

test("AC-12: cache expires past throttle window — fresh evaluation", async () => {
  // 50ms window so the test is fast.
  const client = makeClient({ readThrottleMs: 50 });

  const r1 = await client.checkThresholdBreach("pos-1", { ...baseMetrics, drawdownBps: 100 });
  expect(r1.breached).toBe(false);

  await new Promise((r) => setTimeout(r, 80));

  // After window, fresh evaluation against new metrics — now breached.
  const r2 = await client.checkThresholdBreach("pos-1", { ...baseMetrics, drawdownBps: 5_000 });
  expect(r2.breached).toBe(true);
});

test("FR-9: REDUCE/HEDGE actions throw NotImplementedError synchronously", async () => {
  const client = makeClient();
  await expect(
    client.executePrivateRebalance({ positionId: "p", action: "REDUCE", sizeBps: 5_000 }),
  ).rejects.toThrow(/not implemented in v1/i);
  await expect(
    client.executePrivateRebalance({ positionId: "p", action: "HEDGE", sizeBps: 5_000 }),
  ).rejects.toThrow(/not implemented in v1/i);
});

test("setEncryptedPolicy throws if RISK_POLICY_PROGRAM_ID not yet deployed", async () => {
  const client = makeClient();
  // Until deploy-devnet.ts populates RISK_POLICY_PROGRAM_ID in config/devnet.ts,
  // setEncryptedPolicy throws NotImplementedError with a clear pointer.
  await expect(
    client.setEncryptedPolicy(Keypair.generate().publicKey, new Uint8Array(64)),
  ).rejects.toThrow(/run deploy-devnet/i);
});

test("delegateToGuardian throws NotImplementedError (Pkg-19, Q2)", async () => {
  const client = makeClient();
  await expect(
    client.delegateToGuardian(
      Keypair.generate().publicKey,
      Keypair.generate().publicKey,
      {
        maxNotionalUSD: 1_000,
        allowedInstruments: [],
        maxSlippageBps: 100,
        expiresAtUnix: Date.now() / 1000 + 3600,
      },
    ),
  ).rejects.toThrow(/Pkg-19/);
});
