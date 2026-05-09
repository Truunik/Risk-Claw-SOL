use anchor_lang::prelude::*;

use crate::state::RiskPolicy;

/// Initialize a `RiskPolicy` PDA owned by a Squads V4 vault.
///
/// PRD §2.1: the vault PDA must sign — Anchor's `Signer` constraint is
/// cryptographic proof since vault PDAs can only be invoke_signed by the
/// Squads program. T-28 reject path verifies non-vault signers fail at
/// `update_policy`'s `has_one`.
#[derive(Accounts)]
pub struct InitPolicy<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + RiskPolicy::INIT_SPACE,
        seeds = [RiskPolicy::SEED, owning_multisig_vault.key().as_ref()],
        bump,
    )]
    pub policy: Account<'info, RiskPolicy>,

    /// CHECK: A Squads V4 vault PDA in production. Required to be the signer
    /// of this init — proves the multisig has approved policy creation.
    /// In T-28 unit tests we use a regular keypair (PRD §8 AC-1).
    pub owning_multisig_vault: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub(crate) fn handle(
    ctx: Context<InitPolicy>,
    ciphertext_ref: [u8; 64],
    arcium_handle: [u8; 32],
) -> Result<()> {
    let p = &mut ctx.accounts.policy;
    p.owning_multisig_vault = ctx.accounts.owning_multisig_vault.key();
    p.ciphertext_ref = ciphertext_ref;
    p.arcium_handle = arcium_handle;
    p.updated_at = Clock::get()?.unix_timestamp;
    p.last_check_at = 0;
    p.last_rebalanced_at = 0;
    p.bump = ctx.bumps.policy;
    p.recompute_hash();

    // PRD §9 invariant: do NOT log ciphertext or arcium_handle contents.
    // Logging the *fact* of init + the owning vault is fine — neither is secret.
    msg!(
        "[risk_policy] init_policy vault={} updated_at={}",
        p.owning_multisig_vault,
        p.updated_at,
    );
    Ok(())
}
