// Pkg-20 — registerAgent resolves pre-registered mints + rejects stale config.
// PRD §2.5 + §5. Runtime minting is out of scope; the script `S-23
// scripts/register-agents.ts` owns the mint flow, and this client owns
// resolution + validation.

import { test, expect } from "bun:test";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@anchor-lang/core";

import { createRealClient } from "../src/client";
import { AGENT_REGISTRY } from "../src/ids";
import { OnchainRejectionError } from "../src/errors";
import { DEVNET_AGENTS } from "../../../config/devnet";

function makeClient() {
  // No RPC traffic: registerAgent is a pure config lookup. The Connection +
  // Wallet plumbing only exists to satisfy AnchorProvider's constructor.
  const conn = new Connection("https://api.devnet.solana.com", "confirmed");
  const wallet = new Wallet(Keypair.generate());
  return createRealClient({ connection: conn, wallet, cluster: "devnet" });
}

test("AGENT_REGISTRY mirrors config/devnet.ts::DEVNET_AGENTS", () => {
  for (const zone of ["read", "compute", "execute"] as const) {
    const cfg = DEVNET_AGENTS[zone];
    const reg = AGENT_REGISTRY[zone];
    expect(reg.mint.toBase58()).toBe(cfg.mint);
    expect(reg.pubkey.toBase58()).toBe(cfg.pubkey);
    expect(reg.name).toBe(cfg.name);
  }
});

test("registerAgent resolves the registered mint for each zone", async () => {
  const client = makeClient();
  for (const zone of ["read", "compute", "execute"] as const) {
    const entry = AGENT_REGISTRY[zone];
    const mint = await client.registerAgent({
      zone,
      name: entry.name,
      publicKey: entry.pubkey,
    });
    expect(mint.toBase58()).toBe(entry.mint.toBase58());
  }
});

test("registerAgent rejects when caller's publicKey doesn't match registry", async () => {
  const client = makeClient();
  const stale = Keypair.generate().publicKey;
  await expect(
    client.registerAgent({ zone: "read", name: "Observer", publicKey: stale }),
  ).rejects.toThrow(OnchainRejectionError);
});

test("registry mints are valid base58 PublicKeys (no truncation)", () => {
  for (const zone of ["read", "compute", "execute"] as const) {
    const reg = AGENT_REGISTRY[zone];
    expect(() => new PublicKey(reg.mint.toBase58())).not.toThrow();
    expect(reg.mint.toBytes().length).toBe(32);
  }
});
