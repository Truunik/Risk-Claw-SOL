use anchor_lang::prelude::*;

#[error_code]
pub enum SwigDelegationError {
    /// `execute_rebalance` called within the 30s rate-limit window since the
    /// last successful exec for this policy (B3, PRD §9). The TS-side
    /// `RealClient.executePrivateRebalance` (FR-8b) catches this and resolves
    /// with the prior TxSig — Builder A's Guardian sees a normal success.
    #[msg("execute_rebalance called within idempotency window (30s)")]
    RebalanceTooSoon,

    /// `min_out * 10_000 < expected_out * (10_000 - max_slippage_bps)`
    /// (PRD §2.2 step 2 + §9 input validation). No CPI fires.
    #[msg("slippage check failed: min_out below max_slippage tolerance")]
    SlippageTooHigh,

    /// `action ∈ {Reduce, Hedge}`. v1 only ships `Exit` per PRD FR-9.
    /// Returned to caller as a typed error so Builder A's TS can map.
    #[msg("rebalance action not implemented in v1 (only Exit ships)")]
    NotImplemented,

    /// `size_bps > 10_000` — out of valid 0..=10_000 (basis-point) range.
    #[msg("size_bps must be <= 10_000")]
    InvalidSize,
}
