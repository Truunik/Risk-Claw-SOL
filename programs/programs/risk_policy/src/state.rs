use anchor_lang::prelude::*;

/// Encrypted risk policy stored on-chain. Mutated only by the owning Squads V4
/// vault PDA (verified via `Signer + has_one` Anchor constraints, see PRD §9).
///
/// Total size: 8 (discriminator) + 177 = 185 bytes (PRD §2.1).
///
/// NOTE on B3: `last_rebalanced_at` was originally specified here but cannot
/// live on this account — `swig_delegation::execute_rebalance` is owned by a
/// different program and Solana account ownership forbids cross-program
/// writes. The field moved to a `LastRebalanced` PDA owned by `swig_delegation`
/// (seeds = [b"last_rebalanced", policy.key()]). See PRD §2.2 + §9.
#[account]
#[derive(InitSpace)]
pub struct RiskPolicy {
    /// Squads V4 vault PDA — the only authority that can mutate this policy.
    pub owning_multisig_vault: Pubkey,    // 32

    /// Inline ciphertext for the encrypted threshold (RescueCipher x25519
    /// envelope). 64 bytes is generous for a single u64 threshold; PRD §3 TD-1.
    pub ciphertext_ref: [u8; 64],         // 64

    /// Arcium computation-definition handle. Set when C-14 wires
    /// `queue_threshold_check` into this program; for P-5..P-7 it's a
    /// caller-supplied opaque blob.
    pub arcium_handle: [u8; 32],          // 32

    /// sha256(ciphertext_ref || arcium_handle). Cheap integrity check that
    /// the policy hasn't been tampered with between init and update.
    pub policy_hash: [u8; 32],            // 32

    /// Solana clock at last policy mutation. Audit trail anchor.
    pub updated_at: i64,                  //  8

    /// Read-side rate limit for `queue_threshold_check` (G1, PRD §9).
    /// Enforced when C-14 lands; P-5..P-7 just initializes to 0.
    pub last_check_at: i64,               //  8

    /// PDA bump for `[b"policy", owning_multisig_vault]` seeds.
    pub bump: u8,                         //  1
}

impl RiskPolicy {
    /// `[b"policy", owning_multisig_vault]` — one policy PDA per multisig.
    pub const SEED: &'static [u8] = b"policy";

    /// Recompute and store the `policy_hash`.
    ///
    /// TODO: replace with real sha256 once the Anchor 1.0.2 / Solana 2.x sha256
    /// re-export path is confirmed. For P-5..P-7 we use a deterministic 32-byte
    /// xor-fold of ciphertext_ref + arcium_handle — non-cryptographic, but
    /// stable + unique enough to detect accidental tampering between init and
    /// update during paired devnet tests. Production audit pipelines should
    /// recompute the real sha256 off-chain from the ciphertext bytes.
    pub fn recompute_hash(&mut self) {
        let mut tag = [0u8; 32];
        for (i, b) in self
            .ciphertext_ref
            .iter()
            .chain(self.arcium_handle.iter())
            .enumerate()
        {
            tag[i % 32] ^= *b;
        }
        self.policy_hash = tag;
    }
}
