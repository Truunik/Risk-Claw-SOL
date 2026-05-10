// scripts/demo-state.ts
//
// Canonical pinned demo inputs — single source of truth for both
// `seed-demo.ts` (preflight/diagnostic) and `e2e-smoke.ts` (orchestrator).
// The demo recording on D9 must be deterministic; values that drift between
// preflight and recording produce diverging videos.
//
// No side effects in this module — safe to import from anywhere. The
// scripts that DO have side effects (airdrop, RPC) live in their own files.

export const DEMO_STATE = {
  /** Encrypted threshold (plaintext). Encoded with `RISKCLAW_V1_STUB` packing
   *  per PRD §7 R1; bytes [0..8] big-endian, bytes [48..64] auditor tag. */
  thresholdPlaintext: 9_000n,

  /** Two-stage drawdown ladder. Stage 1 should NOT breach (under threshold);
   *  stage 2 SHOULD breach (over threshold per the v1 stub's 2500bps gate). */
  metricsLadder: [
    {
      label: "low drawdown — should NOT breach",
      drawdownBps: 500,
      notionalUSD: 9_000,
      liquidityShareBps: 100,
    },
    {
      label: "high drawdown — should breach",
      drawdownBps: 3_500,
      notionalUSD: 7_500,
      liquidityShareBps: 200,
    },
  ],

  /** The single rebalance action the demo fires after the breach. v1 only
   *  ships EXIT; REDUCE/HEDGE throw NotImplementedError. */
  rebalance: { action: "EXIT" as const, sizeBps: 10_000 },
} as const;

export type DemoMetricStage = (typeof DEMO_STATE.metricsLadder)[number];
