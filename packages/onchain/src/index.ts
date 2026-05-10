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

// Bundled program IDLs — frozen snapshot of the deployed program ABIs
// (commit `8941698` deployed risk_policy + swig_delegation to devnet at
// FNThNj…PHrzN + 9ECtiz…L9zBo respectively; both `anchor deploy --no-idl`,
// so on-chain IDL fetch is unavailable). Consumers pass these directly
// into createRealClient's `riskPolicyIdl` + `swigDelegationIdl` fields
// — no Anchor CLI required on the consumer's machine.
//
// When programs are redeployed, regenerate via `anchor build` in /programs
// and copy from `programs/target/idl/*.json` into this directory.
import riskPolicyIdlJson from "./idl/risk_policy.json";
import swigDelegationIdlJson from "./idl/swig_delegation.json";
export const riskPolicyIdl = riskPolicyIdlJson;
export const swigDelegationIdl = swigDelegationIdlJson;
