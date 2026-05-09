use anchor_lang::prelude::*;

use crate::state::RiskPolicy;

/// Mutate an existing `RiskPolicy`. The owning Squads vault PDA must sign;
/// `has_one = owning_multisig_vault` enforces address equality on top of
/// the `Signer` constraint — which together prove the multisig itself
/// approved this exact tx (only Squads can `invoke_signed` for the vault PDA).
///
/// T-28 reject path verifies that any non-vault signer fails this constraint.
#[derive(Accounts)]
pub struct UpdatePolicy<'info> {
    #[account(
        mut,
        seeds = [RiskPolicy::SEED, owning_multisig_vault.key().as_ref()],
        bump = policy.bump,
        has_one = owning_multisig_vault,
    )]
    pub policy: Account<'info, RiskPolicy>,

    /// CHECK: Squads V4 vault PDA. `Signer + has_one` is the entire CPI
    /// verification per PRD §3 TD-5.
    pub owning_multisig_vault: Signer<'info>,
}

pub(crate) fn handle(
    ctx: Context<UpdatePolicy>,
    ciphertext_ref: [u8; 64],
    arcium_handle: [u8; 32],
) -> Result<()> {
    let p = &mut ctx.accounts.policy;
    p.ciphertext_ref = ciphertext_ref;
    p.arcium_handle = arcium_handle;
    p.updated_at = Clock::get()?.unix_timestamp;
    p.recompute_hash();

    msg!(
        "[risk_policy] update_policy vault={} updated_at={}",
        p.owning_multisig_vault,
        p.updated_at,
    );
    Ok(())
}
