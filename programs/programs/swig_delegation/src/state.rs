use anchor_lang::prelude::*;

/// Three rebalance actions defined for the type system. v1 only ships `Exit`;
/// `Reduce` and `Hedge` exist for boundary stability with the locked
/// `RebalancePlan.action` enum on Builder A's TS side (see PRD FR-9).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum RebalanceAction {
    Reduce, // returns NotImplemented in v1
    Exit,   // close LP → USDC
    Hedge,  // returns NotImplemented in v1
}

/// Per-policy write-side rate-limit anchor for B3 idempotency (PRD §9).
///
/// Owned by `swig_delegation`. Seeds = `[b"last_rebalanced", policy.key()]`.
/// `policy.key()` is the public key of the RiskPolicy account managed by the
/// `risk_policy` program — the seed binds this PDA to that policy without
/// requiring cross-program writes.
///
/// Total size: 8 (discriminator) + 9 = 17 bytes.
#[account]
#[derive(InitSpace)]
pub struct LastRebalanced {
    /// Solana clock at the most recent successful `execute_rebalance`. Zero
    /// at first-init via `init_if_needed`.
    pub timestamp: i64, // 8

    /// PDA bump.
    pub bump: u8,       // 1
}

impl LastRebalanced {
    pub const SEED: &'static [u8] = b"last_rebalanced";

    /// 30-second write-side rate-limit window per PRD §9 Write-side idempotency.
    /// Larger than FR-5b's 5s read window to absorb confirmation latency + retries.
    pub const RATE_LIMIT_SECS: i64 = 30;
}

/// Emitted on every successful execute_rebalance — Builder A's audit trail
/// viewer (`/app/audit`) subscribes to this. PRD §2.2 + §11.
#[event]
pub struct RebalanceExecutedEvent {
    pub policy: Pubkey,
    pub guardian_authority: Pubkey,
    pub action: RebalanceAction,
    pub size_bps: u16,
    pub ts: i64,
}
