# Builder A — `appStubClient` → `RealClient` swap guide

PR #4 ships the real `@riskclaw/onchain` package. Once merged, this guide
tells you exactly what to change in `app/` to hit deployed devnet programs
instead of the local stub.

**Estimated time:** 15-30 min for the swap + paired smoke verification.

---

## What's deployed and ready

`config/devnet.ts` is already populated (committed in PR #4):

```ts
export const RISK_POLICY_PROGRAM_ID:    string | null = "FNThNjwxtdVSttM1Q9R81pKbiSF7jCzt8vE22A4PHrzN";
export const SWIG_DELEGATION_PROGRAM_ID: string | null = "9ECtiz1EnfKnVDYFKn4GofXGeoCZHupqN2GPkcgL9zBo";
export const DEVNET_AGENTS = {
  read:    { mint: "AERmaK7CD7HGp8zFHP3PEGtfEC6QWZUHYh6Xg8YHwLQU", pubkey: "EsRm…HFRR", name: "Observer" },
  compute: { mint: "Hq5VqNHUNtENWTNTk3ZqJz6jdJExrzw5cUCayAhVUjdo", pubkey: "6GJu…Po22", name: "Analyst"  },
  execute: { mint: "ERxDBEUU6heys5PrA93tGZwjWucvhY3jJdyQpsFE9YzH", pubkey: "Ajeq…BHpW", name: "Guardian" },
};
```

All three programs verified live; integration smoke test (`scripts/smoke-realclient.ts`)
passes 3/3 against deployed devnet (see commit `0f0035e`).

---

## Step 1 — install the package in `app/`

The package lives in the monorepo at `packages/onchain/`. Bun will resolve via
relative path; just import directly. No `bun add` needed since both workspaces
share the repo.

If your tsconfig doesn't already pick it up, add a path alias:

```jsonc
// app/tsconfig.json compilerOptions
"paths": {
  "@riskclaw/onchain": ["../packages/onchain/src/index.ts"]
}
```

---

## Step 2 — replace `app/lib/onchain.ts`

Delete the local types + stub; import from the package.

**Before** (current `app/lib/onchain.ts`):
```ts
export interface OnchainClient { /* ... */ }
export const appStubClient: OnchainClient = { /* throws on most methods */ };
```

**After:**
```ts
import { Connection } from "@solana/web3.js";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import {
  createRealClient,
  riskPolicyIdl,         // bundled — no Anchor CLI needed
  swigDelegationIdl,     // bundled — no Anchor CLI needed
  type OnchainClient,
} from "@riskclaw/onchain";
import {
  RPC_ENDPOINT,
  RISK_POLICY_PROGRAM_ID,
  SWIG_DELEGATION_PROGRAM_ID,
} from "../../config/devnet";

export type { OnchainClient };

/** Hook that returns a RealClient bound to the connected Phantom wallet.
 *  Returns null if RISK_POLICY_PROGRAM_ID isn't set yet (PR #4 not merged). */
export function useOnchainClient(): OnchainClient | null {
  const wallet = useAnchorWallet();
  if (!wallet) return null;
  if (!RISK_POLICY_PROGRAM_ID || !SWIG_DELEGATION_PROGRAM_ID) return null;

  const connection = new Connection(RPC_ENDPOINT, "confirmed");
  return createRealClient({
    connection,
    wallet,
    cluster: "devnet",
    riskPolicyIdl: riskPolicyIdl as never,
    swigDelegationIdl: swigDelegationIdl as never,
  });
}
```

**The IDLs ship bundled inside the package** — frozen snapshot of the ABIs
deployed to devnet at PR #4. No `anchor build` on Builder A's device needed.
When programs are redeployed, Builder B regenerates from `programs/target/idl/`
into `packages/onchain/src/idl/`.

---

## Step 3 — replace `app/lib/encrypt.ts`

Use the package's `encryptThreshold` instead of `encryptThresholdStub`.

**Before:**
```ts
export function encryptThresholdStub(plaintext: bigint): Uint8Array { /* JSON pack */ }
```

**After:**
```ts
import { encryptThreshold, MXE_CLUSTER_PUBKEY } from "@riskclaw/onchain";

export async function encryptThresholdForApp(plaintext: bigint): Promise<Uint8Array> {
  return encryptThreshold(plaintext, MXE_CLUSTER_PUBKEY);
}
```

**Note:** `MXE_CLUSTER_PUBKEY` is `null` in v1 (Arcium runtime gated on C-14).
The placeholder packing returns a 64-byte buffer with `RISKCLAW_V1_STUB` ASCII tag at
bytes [48..64] — auditors reading on-chain ciphertext see immediately it's v1
placeholder (not cryptographic). Documented loudly in `T-34-audit.md`.

---

## Step 4 — wire `/app/audit` to real events

`app/lib/audit.ts::generateDemoEvents()` is currently synthetic. Replace with
a real `program.addEventListener` subscription.

```ts
import * as anchor from "@anchor-lang/core";
import { useEffect, useState } from "react";

// In your audit page component:
useEffect(() => {
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const swig = new anchor.Program(SwigIdl as never, provider);

  const id = swig.addEventListener("rebalanceExecutedEvent", (event) => {
    setEvents((prev) => [
      ...prev,
      {
        kind: "rebalance-executed",
        policy: event.policy.toBase58(),
        action: Object.keys(event.action)[0],
        sizeBps: event.sizeBps,
        ts: event.ts.toNumber(),
      },
    ]);
  });
  return () => { void swig.removeEventListener(id); };
}, [wallet]);
```

For the agent identity cards: pull the three Core asset mints from
`config/devnet.ts::DEVNET_AGENTS`. Use `@metaplex-foundation/mpl-core::fetchAssetV1`
to resolve onchain metadata + Attributes plugin for each zone.

---

## Step 5 — verify the swap end-to-end

After steps 1-4, run a smoke pass:

```bash
# 1. Type-check the app
cd app && bun run -- tsc --noEmit
# Expected: exit 0

# 2. Start dev server
bun run dev
# Expected: http://localhost:3000 loads /, /policy, /audit

# 3. /policy: connect Phantom (devnet wallet must have SOL)
#    Submit a policy. Should see real tx signature instead of stub-set-policy-...
#    Verify on https://explorer.solana.com/?cluster=devnet

# 4. /audit: open the page after a policy submit
#    Should see a real "policy-set" event entry with the actual TxSig
```

If anything fails, run our integration smoke test as a known-good baseline:
```bash
cd scripts && bun run smoke-realclient
# Expected: ALL THREE STEPS PASSED
```

If `smoke-realclient` passes but the app doesn't, the issue is in the app
wiring (likely the wallet adapter or IDL import path). If `smoke-realclient`
also fails, ping Builder B — that means the deployed state regressed.

---

## What's still v1 / stubbed

- **`encryptThreshold`** — placeholder packing (RISKCLAW_V1_STUB tag); real RescueCipher gated on C-14.
- **`checkThresholdBreach`** — deterministic mock from `metrics.drawdownBps` ≥ 2500; real Arcium MPC compute gated on C-14.
- **`executePrivateRebalance`** — real swig_delegation tx; v1 stub has no actual Swig CPI inside (P-11 deferred Q2).
- **`delegateToGuardian`** — throws `NotImplementedError` (Pkg-19, Q2 deferred).
- **`registerAgent`** in RealClient — throws `NotImplementedError`. The three agents
  ARE minted on devnet (`scripts/register-agents.ts` did it); use `DEVNET_AGENTS`
  directly from `config/devnet.ts`.

All deferrals are in PRD §7 R1 fallback framing.

---

## Quick reference — Builder B's deployed state

| Resource | Address | Verify |
|---|---|---|
| risk_policy program | `FNThNjwxtdVSttM1Q9R81pKbiSF7jCzt8vE22A4PHrzN` | `solana program show <ID> --url devnet` |
| swig_delegation program | `9ECtiz1EnfKnVDYFKn4GofXGeoCZHupqN2GPkcgL9zBo` | same |
| Observer Core NFT | `AERmaK7CD7HGp8zFHP3PEGtfEC6QWZUHYh6Xg8YHwLQU` | https://explorer.solana.com |
| Analyst Core NFT | `Hq5VqNHUNtENWTNTk3ZqJz6jdJExrzw5cUCayAhVUjdo` | https://explorer.solana.com |
| Guardian Core NFT | `ERxDBEUU6heys5PrA93tGZwjWucvhY3jJdyQpsFE9YzH` | https://explorer.solana.com |
| Deploy authority wallet | `2JAmdww5RrzMhFsYcypagtNuHE466vbQ1wBKstuDs24W` | balance ~2.74 SOL devnet |

If you need Builder B to airdrop more SOL or rotate any keypair, ping in CONTINUE.md.
