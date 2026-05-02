# /programs — Anchor workspace

Builder B territory. Solana programs for policy storage and bounded delegation.

## Setup

This directory is intentionally empty. Builder B scaffolds Anchor inside it
on D1 (2026-05-03):

```bash
# Prerequisites
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked

# Init workspace
cd programs
anchor init . --no-git
anchor new risk_policy
anchor new swig_delegation
```

## Programs

- `risk_policy` — stores ciphertext pointer + Arcium handle. Policy
  updates are multisig-gated (Squads).
- `swig_delegation` — bounded execution authority for Guardian. Wraps
  Swig's programmable delegation primitives.

## Boundary with Builder A

Builder B owns and ships `@riskclaw/onchain` — a TypeScript client package
that Builder A's `/agents` and `/app` consume. Lock the function signatures
defined in `BUILD_PLAN.md` by 2026-05-04 EOD.
