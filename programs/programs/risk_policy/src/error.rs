use anchor_lang::prelude::*;

/// All errors emitted by `risk_policy`. Variants for instructions that don't
/// land until later tasks are reserved here so the error code numbers stay
/// stable across PRs.
#[error_code]
pub enum RiskClawError {
    /// `queue_threshold_check` called by a signer that is not the registered
    /// Analyst agent (G1, PRD §9). Reserved for C-14.
    #[msg("queue_threshold_check caller is not the registered Analyst agent")]
    UnauthorizedAnalyst,

    /// `queue_threshold_check` called within the 5s rate-limit window since
    /// the last successful call for this policy (G1 + FR-5b). Reserved for C-14.
    #[msg("queue_threshold_check called within rate-limit window")]
    CheckTooSoon,

    /// Ciphertext supplied to init/update was not 64 bytes (PRD §9 input validation).
    #[msg("ciphertext_ref must be exactly 64 bytes")]
    InvalidCiphertextSize,
}
