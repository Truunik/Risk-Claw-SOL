use arcis::*;

#[encrypted]
mod circuits {
    use arcis::*;

    /// Compare an encrypted threshold against a plaintext risk score.
    ///
    /// PRIVACY INVARIANT — load-bearing for the audit-grade pitch:
    ///   The second return value MUST be `score` (the input, unchanged).
    ///   Any function of `t` (the decrypted-inside-MPC threshold) leaks the
    ///   threshold across firings — an adversary observing many
    ///   `(score_in, score_out)` pairs could correlate them with the boolean
    ///   to recover bits of `t`. Returning `score` directly preserves the
    ///   boolean signal without correlation.
    ///
    /// Side-channel mitigations on the read path live in the calling Anchor
    /// program (see PRD §9 G1 and `risk_policy::queue_threshold_check`):
    ///   - Analyst-only `Signer` constraint
    ///   - 5s `last_check_at` rate limit
    ///
    /// Inputs:
    ///   - `threshold`: encrypted u64 (the institution's risk policy value)
    ///   - `score`:     plaintext u64 (computed off-chain by Analyst from PositionMetrics)
    /// Output:
    ///   - `breached`: true iff score >= decrypted_threshold
    ///   - `score`:    passthrough of the input
    #[instruction]
    pub fn compare(threshold: Enc<Shared, u64>, score: u64) -> (bool, u64) {
        let t = threshold.to_arcis();
        let breached = (score >= t).reveal();
        // `score` is already plaintext input; passing it through unchanged
        // satisfies the privacy invariant (no `t`-derived value leaks).
        (breached, score)
    }
}
