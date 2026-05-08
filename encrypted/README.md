# /encrypted — Arcis MPC circuits (Builder B)

Arcium toolchain (`arcup`/`arcium`/Arcis compiler) + Docker via OrbStack. The actual circuit project is at `threshold_compare/`.

## Layout (as scaffolded by `arcium init`)

```
threshold_compare/
├── encrypted-ixs/src/lib.rs    # Arcis circuit (the MPC primitive — currently Hello World add_together)
├── programs/threshold_compare/ # Reference Anchor host program showing queue_computation pattern
├── Anchor.toml + Arcium.toml   # toolchain + cluster config (Cerberus backend, 2-node localnet)
├── tests/threshold_compare.ts  # ts-mocha test harness
└── package.json + yarn.lock    # frontend deps (per arcium init default to yarn)
```

## Build / verify

```bash
cd threshold_compare
arcium build         # compiles circuit + host program + IDLs
arcium localnet      # spins up local 2-node MXE cluster (requires Docker)
arcium test          # runs ts-mocha tests against localnet
```

## State (Q1 kill-switch — RESOLVED)

- Toolchain compiles the Hello World `add_together` circuit cleanly (commit log).
- The reference host program at `programs/threshold_compare/` is a *demonstrator* — our real production host is `risk_policy` in the repo's `/programs/` workspace, wired to Arcium in PRD task C-14.
- Next: replace `add_together` with `compare(threshold, score) -> (bool, u64)` per PRD §2.3 (task C-13).

## Known warnings (non-fatal)

- arcium-client 0.9.7 has a stack-frame size warning in its IDL `TryFrom` impl (~865KB). Their crate, not ours; no action.
- Pinned `anchor_version = "0.32.1"` in `threshold_compare/Anchor.toml` to match `arcium-anchor` 0.9.7's anchor-lang dep.
