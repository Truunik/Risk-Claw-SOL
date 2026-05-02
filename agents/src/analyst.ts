import type { OnchainClient } from "./onchain-client";
import type { PositionMetrics, ThresholdCheckResult } from "./types";

// COMPUTE ZONE.
// No signing key. Never holds the policy in plaintext.
// Sends ciphertext + metrics to Builder B's Arcium MPC circuit and
// receives only { breached, score }. The threshold never decrypts here.
export type Analyst = {
  evaluate(metrics: PositionMetrics): Promise<ThresholdCheckResult>;
};

export function createAnalyst(deps: { onchain: OnchainClient }): Analyst {
  return {
    async evaluate(metrics) {
      return deps.onchain.checkThresholdBreach(metrics.positionId, metrics);
    },
  };
}
