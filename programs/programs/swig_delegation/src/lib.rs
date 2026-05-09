pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("9ECtiz1EnfKnVDYFKn4GofXGeoCZHupqN2GPkcgL9zBo");

#[program]
pub mod swig_delegation {
    use super::*;

    /// Bounded rebalance executor with B3 idempotency + slippage gate.
    /// PRD tasks P-9 / P-10 / P-10b. AC-5/AC-6/AC-7/AC-13 in PRD §8.
    ///
    /// The full Swig CPI (`sign_v1`) wiring lands in P-11 once the Q2 spike
    /// resolves the Swig SDK API. v1 ships the gate + audit event only.
    pub fn execute_rebalance(
        ctx: Context<ExecuteRebalance>,
        policy_key: Pubkey,
        action: RebalanceAction,
        size_bps: u16,
        max_slippage_bps: u16,
        expected_out: u64,
        min_out: u64,
    ) -> Result<()> {
        instructions::execute_rebalance::handle(
            ctx,
            policy_key,
            action,
            size_bps,
            max_slippage_bps,
            expected_out,
            min_out,
        )
    }
}
