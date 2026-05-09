// @riskclaw/onchain — Builder B's TypeScript client for the OnchainClient
// boundary defined by Builder A (agents/src/onchain-client.ts).
//
// PRD §2.4 + §5. Interface and shared types are re-exported from
// agents/src/ to keep the boundary single-source — any signature drift on
// Builder A's side breaks typecheck here immediately.

export { RealClient, createRealClient } from "./client";
export type { CreateRealClientOpts } from "./client";

export {
  ArciumClusterUnavailableError,
  ArciumTimeoutError,
  MultisigSignatureRejectedError,
  NotImplementedError,
  OnchainRejectionError,
  RiskclawError,
  SlippageRejectedError,
} from "./errors";

export {
  encryptThreshold,
  MXE_CLUSTER_PUBKEY,
  _testDecryptPlaceholder,
} from "./encrypt";

export {
  DEV_MULTISIG,
  LAST_REBALANCED_SEED,
  RISK_POLICY_PROGRAM_ID,
  RISK_POLICY_SEED,
  SQUADS_V4_PROGRAM_ID,
  SWIG_DELEGATION_PROGRAM_ID,
  deriveLastRebalancedPda,
  deriveRiskPolicyPda,
} from "./ids";

export type { OnchainClient } from "../../../agents/src/onchain-client";
export type {
  AgentConfig,
  DelegationPolicy,
  MintAddress,
  PositionMetrics,
  RebalancePlan,
  ThresholdCheckResult,
  TxSig,
} from "../../../agents/src/types";
