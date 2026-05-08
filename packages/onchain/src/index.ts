// @riskclaw/onchain — TypeScript client implementing the OnchainClient
// boundary defined by Builder A in agents/src/onchain-client.ts.
//
// Skeleton only. Real implementations land in Pkg-15..22 (see
// .planning/builder-b/PRD.md §12 + STATUS.md pipeline).
//
// The interface and shared types are intentionally re-exported from
// Builder A's agents/src/ to keep the boundary surface single-source. If
// Builder A ever changes a signature, typecheck here breaks immediately
// — that's the desired feedback loop.

export type {
  OnchainClient,
} from "../../../agents/src/onchain-client";

export type {
  AgentConfig,
  DelegationPolicy,
  MintAddress,
  PositionMetrics,
  RebalancePlan,
  ThresholdCheckResult,
  TxSig,
} from "../../../agents/src/types";
