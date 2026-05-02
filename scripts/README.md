# /scripts — devnet deployment + demo harness

Shared territory. Scripts for both builders to run end-to-end demos and
devnet deploys.

## Planned contents

- `deploy-devnet.ts` — deploys Anchor programs and registers Metaplex 014
  agent identities on devnet
- `seed-demo.ts` — sets up a scripted demo scenario (LP position with a
  scripted risk event for the demo video, target shoot 2026-05-11)
- `replay-audit.ts` — verifies the audit trail end-to-end from Core NFT
  signatures back to the bounded delegation that authorized them
