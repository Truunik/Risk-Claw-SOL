pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("FNThNjwxtdVSttM1Q9R81pKbiSF7jCzt8vE22A4PHrzN");

#[program]
pub mod risk_policy {
    use super::*;

    /// Create a new RiskPolicy PDA owned by a Squads V4 vault. PRD task P-6.
    /// AC-1 + AC-2 in PRD §8.
    pub fn init_policy(
        ctx: Context<InitPolicy>,
        ciphertext_ref: [u8; 64],
        arcium_handle: [u8; 32],
    ) -> Result<()> {
        instructions::init_policy::handle(ctx, ciphertext_ref, arcium_handle)
    }

    /// Update an existing RiskPolicy. Vault `Signer + has_one` constraints
    /// reject any non-vault signer. PRD task P-7.
    pub fn update_policy(
        ctx: Context<UpdatePolicy>,
        ciphertext_ref: [u8; 64],
        arcium_handle: [u8; 32],
    ) -> Result<()> {
        instructions::update_policy::handle(ctx, ciphertext_ref, arcium_handle)
    }
}
