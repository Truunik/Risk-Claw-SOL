# /encrypted — Arcium Arcis circuits

Builder B territory. Encrypted compute for the policy comparison.

## Setup

This directory is intentionally empty. Builder B scaffolds Arcis inside it
on D1 (2026-05-03):

```bash
# Install Arcis (Arcium's Rust framework)
# Reference: https://docs.arcium.com
cd encrypted
cargo new --lib threshold_compare
```

## What lives here

- `threshold_compare` — MPC circuit that compares an encrypted threshold
  against computed risk metrics. Inputs:
  - encrypted threshold ciphertext
  - plaintext risk score (computed by Analyst from observed metrics)
- Output: `{ breached: bool, score: u16 }`. The threshold itself never
  decrypts to plaintext anywhere in the system.

## Why this is load-bearing

The README claims "agents never see plaintext." The Arcis circuit is the
only thing comparison happens inside. If the comparison ever runs outside
Arcium (even as a fallback), the claim breaks. Document any v1 caveats
explicitly — do not paper over them.
