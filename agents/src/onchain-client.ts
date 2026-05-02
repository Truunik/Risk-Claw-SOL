import type { PublicKey } from "@solana/web3.js";
import type {
  AgentConfig,
  DelegationPolicy,
  MintAddress,
  PositionMetrics,
  RebalancePlan,
  ThresholdCheckResult,
  TxSig,
} from "./types";

// The boundary between the two builders.
// Builder B (Programs + Privacy) implements this and ships it as
// @riskclaw/onchain. Builder A (App + Agents) consumes it and never
// makes raw RPC calls or signs transactions outside of it.
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
  registerAgent(agent: AgentConfig): Promise<MintAddress>;
}

// Used by Builder A until Builder B's package is wired in.
// Behavior: never breaches, never executes — keeps the orchestration
// loop runnable while Builder B works in parallel.
export const stubClient: OnchainClient = {
  async setEncryptedPolicy() {
    throw new Error("[stub] setEncryptedPolicy — Builder B");
  },
  async delegateToGuardian() {
    throw new Error("[stub] delegateToGuardian — Builder B");
  },
  async checkThresholdBreach() {
    return { breached: false, score: 0 };
  },
  async executePrivateRebalance() {
    throw new Error("[stub] executePrivateRebalance — Builder B");
  },
  async registerAgent() {
    throw new Error("[stub] registerAgent — Builder B");
  },
};
