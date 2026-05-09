// Typed errors @riskclaw/onchain throws to consumers. Builder A handles
// each by class name (PRD §5).
//
// Convention: every error is a subclass of `RiskclawError` so consumers can
// `instanceof` discriminate. Each error subclass keeps the original cause
// for forensics — never swallow original onchain error text.

export class RiskclawError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** `checkThresholdBreach` waited >30s for the Arcium MXE callback (FR-6). */
export class ArciumTimeoutError extends RiskclawError {}

/** Arcium MXE cluster could not be reached (queue saturated, network error). */
export class ArciumClusterUnavailableError extends RiskclawError {}

/** `swig_delegation::execute_rebalance` rejected for slippage > maxSlippageBps (PRD AC-6). */
export class SlippageRejectedError extends RiskclawError {}

/** Action ∈ {REDUCE, HEDGE} or otherwise unimplemented in v1 (PRD FR-9). */
export class NotImplementedError extends RiskclawError {
  constructor(
    public readonly what: string,
    cause?: unknown,
  ) {
    super(`not implemented in v1: ${what}`, cause);
  }
}

/** Squads multisig flow rejected (proposal didn't reach threshold, signer mismatch). */
export class MultisigSignatureRejectedError extends RiskclawError {}

/** Generic onchain rejection (catch-all for typed RPC errors we haven't classified). */
export class OnchainRejectionError extends RiskclawError {}
