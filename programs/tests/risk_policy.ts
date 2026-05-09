// T-28 — RiskPolicy Anchor unit tests (PRD §8 AC-1 + AC-2).
//
// Verifies P-5..P-7:
//   AC-1  init_policy with vault as Signer → PDA exists with correct fields
//   AC-1b update_policy with same vault    → fields update; updated_at advances
//   AC-2  update_policy with non-vault      → ConstraintHasOne / ConstraintSeeds rejection
//
// Squads vault PDA is *mocked* with a regular Keypair per PRD §8 G4 — the
// `Signer + has_one` constraint pattern is structurally tested here; real
// Squads invoke_signed flow is verified end-to-end in S-27b.

import * as anchor from "@anchor-lang/core";
import type { Program } from "@anchor-lang/core";
import type { RiskPolicy } from "../target/types/risk_policy";
import { expect } from "chai";

const { web3, BN } = anchor;
const { Keypair, PublicKey, SystemProgram } = web3;

describe("risk_policy", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.RiskPolicy as Program<RiskPolicy>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  // Mock Squads vault keypair — in production this is a Squads-derived PDA
  // that only the Squads program can `invoke_signed` for.
  const vault = Keypair.generate();

  // Helper: derive policy PDA for a given vault.
  const findPolicyPda = (vaultKey: anchor.web3.PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), vaultKey.toBuffer()],
      program.programId,
    );

  // 64 bytes of synthetic ciphertext + 32 bytes of synthetic Arcium handle.
  // Real Arcium-encrypted bytes land when Builder A's app uses encryptThreshold.
  const ciphertextV1 = new Array(64).fill(0).map((_, i) => (i + 1) & 0xff);
  const ciphertextV2 = new Array(64).fill(0).map((_, i) => (i + 2) & 0xff);
  const arciumHandle = new Array(32).fill(0).map((_, i) => (i + 100) & 0xff);

  before(async () => {
    // Fund the vault keypair so it can pay for tx fees as a Signer.
    const sig = await provider.connection.requestAirdrop(
      vault.publicKey,
      1 * web3.LAMPORTS_PER_SOL,
    );
    await provider.connection.confirmTransaction(sig, "confirmed");
  });

  it("AC-1: init_policy with vault Signer creates the PDA with correct fields", async () => {
    const [policyPda, bump] = findPolicyPda(vault.publicKey);

    await program.methods
      .initPolicy(ciphertextV1, arciumHandle)
      .accounts({
        owningMultisigVault: vault.publicKey,
      })
      .signers([vault])
      .rpc();

    const account = await program.account.riskPolicy.fetch(policyPda);
    expect(account.owningMultisigVault.toBase58()).to.equal(vault.publicKey.toBase58());
    expect(Array.from(account.ciphertextRef)).to.deep.equal(ciphertextV1);
    expect(Array.from(account.arciumHandle)).to.deep.equal(arciumHandle);
    expect(account.lastCheckAt.toNumber()).to.equal(0);      // G1 init value
    expect(account.lastRebalancedAt.toNumber()).to.equal(0); // B3 init value
    expect(account.bump).to.equal(bump);
    expect(account.updatedAt.toNumber()).to.be.greaterThan(0);
    // policy_hash is non-cryptographic xor-fold for v1 — just assert it's
    // not all-zero (placeholder code path was reached).
    expect(Array.from(account.policyHash).some((b) => b !== 0)).to.equal(true);
  });

  it("AC-1b: update_policy with same vault Signer mutates fields and advances updated_at", async () => {
    const [policyPda] = findPolicyPda(vault.publicKey);
    const before = await program.account.riskPolicy.fetch(policyPda);
    const updatedAtBefore = before.updatedAt.toNumber();

    // Solana clock has 1s granularity; sleep a beat so updated_at strictly increases.
    await new Promise((r) => setTimeout(r, 1100));

    await program.methods
      .updatePolicy(ciphertextV2, arciumHandle)
      .accounts({
        owningMultisigVault: vault.publicKey,
      })
      .signers([vault])
      .rpc();

    const after = await program.account.riskPolicy.fetch(policyPda);
    expect(Array.from(after.ciphertextRef)).to.deep.equal(ciphertextV2);
    expect(after.updatedAt.toNumber()).to.be.greaterThan(updatedAtBefore);
    // policy_hash should change because ciphertext changed.
    expect(Array.from(after.policyHash)).to.not.deep.equal(Array.from(before.policyHash));
  });

  it("AC-2: update_policy with non-vault Signer is rejected by Anchor constraints", async () => {
    const attacker = Keypair.generate();
    // Fund the attacker so the only failure is the constraint, not insufficient lamports.
    const sig = await provider.connection.requestAirdrop(
      attacker.publicKey,
      1 * web3.LAMPORTS_PER_SOL,
    );
    await provider.connection.confirmTransaction(sig, "confirmed");

    let threw = false;
    try {
      await program.methods
        .updatePolicy(ciphertextV1, arciumHandle)
        .accounts({
          // Pass the attacker as the vault — `Signer` will accept (it IS a
          // signer) but `seeds` derivation + `has_one` will reject because
          // the policy account stored at [b"policy", attacker] doesn't exist
          // OR the seeds don't match the policy account we're targeting.
          owningMultisigVault: attacker.publicKey,
        })
        .signers([attacker])
        .rpc();
    } catch (err: any) {
      threw = true;
      const msg = err?.toString() ?? "";
      // Either the seeds derive a different (non-existent) PDA → AccountNotInitialized,
      // or anchor flags the mismatch → ConstraintSeeds / ConstraintHasOne.
      expect(
        /AccountNotInitialized|ConstraintSeeds|ConstraintHasOne|seeds constraint was violated/i.test(msg),
      ).to.equal(true, `unexpected error shape: ${msg}`);
    }
    expect(threw).to.equal(true, "non-vault signer should have failed");
  });
});
