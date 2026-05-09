// app/lib/onchain.ts
// Local OnchainClient stub used by /app until Builder B ships @riskclaw/onchain
// (Pkg-15..22 — RealClient implementation, MXE_CLUSTER_PUBKEY, build*Ix helpers).
//
// This mirrors agents/src/onchain-client.ts so the app and the agent loop
// share the same boundary surface. Swap the import to @riskclaw/onchain as
// soon as it ships — the rest of the app code does not change.

import type { PublicKey } from "@solana/web3.js";

export type TxSig = string;

export type DelegationPolicy = {
  maxNotionalUSD: number;
  allowedInstruments: string[];
  maxSlippageBps: number;
  expiresAtUnix: number;
};

export type RebalancePlan = {
  positionId: string;
  action: "REDUCE" | "EXIT" | "HEDGE";
  sizeBps: number;
};

export type ThresholdCheckResult = { breached: boolean; score: number };

export type PositionMetrics = {
  positionId: string;
  notionalUSD: number;
  drawdownBps: number;
  liquidityShareBps: number;
  observedAtUnixMs: number;
};

export interface OnchainClient {
  setEncryptedPolicy(
    multisig: PublicKey,
    ciphertext: Uint8Array,
  ): Promise<TxSig>;
  delegateToGuardian(
    multisig: PublicKey,
    guardian: PublicKey,
    policy: DelegationPolicy,
  ): Promise<TxSig>;
  checkThresholdBreach(
    positionId: string,
    metrics: PositionMetrics,
  ): Promise<ThresholdCheckResult>;
  executePrivateRebalance(plan: RebalancePlan): Promise<TxSig>;
}

// Local stub: setEncryptedPolicy returns a deterministic mock TxSig so the UI
// has a "proposed" state to render. Other methods throw — they aren't on the
// app's hot path yet. Replaced wholesale by @riskclaw/onchain when shipped.
export const appStubClient: OnchainClient = {
  async setEncryptedPolicy(multisig, ciphertext) {
    const fingerprint = Array.from(ciphertext.slice(0, 4))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `stub-set-policy-${multisig.toBase58().slice(0, 8)}-${fingerprint}`;
  },
  async delegateToGuardian() {
    throw new Error("[stub] delegateToGuardian — Builder B (Pkg-15..22)");
  },
  async checkThresholdBreach() {
    return { breached: false, score: 0 };
  },
  async executePrivateRebalance() {
    throw new Error("[stub] executePrivateRebalance — Builder B (Pkg-15..22)");
  },
};
