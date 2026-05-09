use anchor_lang::prelude::*;

use crate::error::SwigDelegationError;
use crate::state::{LastRebalanced, RebalanceAction, RebalanceExecutedEvent};

/// Bounded rebalance executor. PRD §2.2 + §9.
///
/// Step ordering (matters for test design):
///   0. Idempotency check (B3) — `now - last_rebalanced.timestamp >= 30s`
///   1. Action check         — `action == Exit` else NotImplemented
///   2. size_bps check       — `<= 10_000`
///   3. Slippage check       — `min_out * 10_000 >= expected_out * (10_000 - max_slippage_bps)`
///   4. (v2) CPI to Swig sign_v1 with the inner swap ix as remaining_accounts
///   5. Update last_rebalanced.timestamp; emit RebalanceExecutedEvent
///
/// V1 stub: step 4 is logged but not yet wired (Q2 spike — Swig SDK API).
/// The atomic feature ships idempotency + slippage gate + audit event so
/// Builder A's audit viewer is unblocked.
#[derive(Accounts)]
#[instruction(policy_key: Pubkey)]
pub struct ExecuteRebalance<'info> {
    /// CHECK: Public key of the RiskPolicy account this rebalance targets.
    /// Used solely as a seed for `last_rebalanced` — `swig_delegation` does
    /// not validate the RiskPolicy itself (caller is the trusted Guardian
    /// agent; in v2 we'd require it as a remaining_account and check the
    /// discriminator).
    pub policy: UncheckedAccount<'info>,

    /// Per-policy idempotency anchor. Init-on-first-call.
    #[account(
        init_if_needed,
        payer = guardian_authority,
        space = 8 + LastRebalanced::INIT_SPACE,
        seeds = [LastRebalanced::SEED, policy.key().as_ref()],
        bump,
    )]
    pub last_rebalanced: Account<'info, LastRebalanced>,

    /// In production this is a Swig sub-authority registered as the
    /// `zone="execute"` Metaplex Core agent. T-29 unit tests use a regular
    /// keypair — the structural integrity of the rate-limit + slippage gate
    /// is what's verified here. Swig sub-authority enforcement is verified
    /// in S-27b end-to-end.
    #[account(mut)]
    pub guardian_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[allow(clippy::too_many_arguments)]
pub(crate) fn handle(
    ctx: Context<ExecuteRebalance>,
    _policy_key: Pubkey, // unused at runtime; carried in instruction args for the seed binding
    action: RebalanceAction,
    size_bps: u16,
    max_slippage_bps: u16,
    expected_out: u64,
    min_out: u64,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;

    // Step 0: B3 idempotency.
    let lr = &mut ctx.accounts.last_rebalanced;
    let elapsed = now.saturating_sub(lr.timestamp);
    require!(
        lr.timestamp == 0 || elapsed >= LastRebalanced::RATE_LIMIT_SECS,
        SwigDelegationError::RebalanceTooSoon
    );

    // Step 1: action gate.
    require!(
        action == RebalanceAction::Exit,
        SwigDelegationError::NotImplemented
    );

    // Step 2: size bounds.
    require!(
        size_bps <= 10_000,
        SwigDelegationError::InvalidSize
    );

    // Step 3: slippage gate.
    //   min_out / expected_out >= (10_000 - max_slippage_bps) / 10_000
    // Rearranged to avoid division and stay in u128 to dodge overflow:
    let lhs = (min_out as u128) * 10_000u128;
    let rhs = (expected_out as u128) * (10_000u128 - max_slippage_bps as u128);
    require!(lhs >= rhs, SwigDelegationError::SlippageTooHigh);

    // Step 4 (v2): CPI to Swig sign_v1 with the swap ix.
    // For v1 we just log the intent; the audit event below is the only
    // observable side-effect. Builder B re-enters this in P-11 (after Q2 spike).
    msg!(
        "[swig_delegation] execute_rebalance (v1 stub): policy={} action={:?} size_bps={} slippage_bps<={} min_out={}",
        ctx.accounts.policy.key(),
        action,
        size_bps,
        max_slippage_bps,
        min_out,
    );

    // Step 5: write the rate-limit timestamp + emit event.
    lr.timestamp = now;
    lr.bump = ctx.bumps.last_rebalanced;

    emit!(RebalanceExecutedEvent {
        policy: ctx.accounts.policy.key(),
        guardian_authority: ctx.accounts.guardian_authority.key(),
        action,
        size_bps,
        ts: now,
    });

    Ok(())
}
