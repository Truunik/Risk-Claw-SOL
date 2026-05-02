import type { OnchainClient } from "./onchain-client";
import type { RebalancePlan, TxSig } from "./types";

// EXECUTE ZONE.
// The only zone with a signing key. Bounded by Swig delegation
// (max notional, allowed instruments, max slippage, expiry).
// Receives only "rebalance / no-op" decisions from the compute zone —
// never the threshold itself.
export type Guardian = {
  execute(plan: RebalancePlan): Promise<TxSig>;
};

export function createGuardian(deps: { onchain: OnchainClient }): Guardian {
  return {
    async execute(plan) {
      console.log(
        `[guardian] executing ${plan.action} ${plan.sizeBps}bps on ${plan.positionId}`,
      );
      return deps.onchain.executePrivateRebalance(plan);
    },
  };
}
