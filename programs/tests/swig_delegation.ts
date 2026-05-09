// T-29 / T-29b — swig_delegation::execute_rebalance unit tests
// (PRD §8 AC-5/AC-6/AC-7/AC-13).
//
// Test design — order matters because B3 idempotency persists state across
// tests. We reject-first, then succeed-then-idempotency-reject. Step ordering
// in execute_rebalance:
//   0. idempotency  →  rejected here means state NOT updated
//   1. action gate
//   2. size_bps gate
//   3. slippage gate
//   4. (v2) Swig CPI
//   5. update last_rebalanced + emit event
//
// So with a fresh policy (last_rebalanced.timestamp == 0), the idempotency
// check passes (timestamp==0 special case) and we hit the *next* check.
// Rejections at steps 1-3 don't touch step 5, leaving state pristine for the
// next test.

import * as anchor from "@anchor-lang/core";
import type { Program } from "@anchor-lang/core";
import type { SwigDelegation } from "../target/types/swig_delegation";
import { expect } from "chai";

const { web3, BN } = anchor;
const { Keypair, PublicKey } = web3;

describe("swig_delegation", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.SwigDelegation as Program<SwigDelegation>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  // Mock guardian (in production: a Swig sub-authority registered as the
  // zone="execute" Metaplex Core agent). PRD §8 G4 — unit tests use a
  // regular keypair; real Swig flow verified in S-27b.
  const guardian = Keypair.generate();

  // Use distinct mock policy pubkeys per test so each test gets a fresh
  // last_rebalanced PDA (idempotency state is per-policy).
  const policyA = Keypair.generate().publicKey; // rejection-path policy
  const policyB = Keypair.generate().publicKey; // happy-path + idempotency policy

  const findLastRebalanced = (policyKey: anchor.web3.PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("last_rebalanced"), policyKey.toBuffer()],
      program.programId,
    );

  before(async () => {
    const sig = await provider.connection.requestAirdrop(
      guardian.publicKey,
      2 * web3.LAMPORTS_PER_SOL,
    );
    await provider.connection.confirmTransaction(sig, "confirmed");
  });

  it("AC-7: action=Reduce → NotImplemented (no state change)", async () => {
    const action = { reduce: {} }; // anchor enum encoding
    let threw = false;
    try {
      await program.methods
        .executeRebalance(
          policyA,
          action as never,
          5_000,
          100,
          new BN(1_000),
          new BN(995),
        )
        .accounts({
          policy: policyA,
          guardianAuthority: guardian.publicKey,
        })
        .signers([guardian])
        .rpc();
    } catch (err: any) {
      threw = true;
      expect(/NotImplemented/i.test(err.toString())).to.equal(true, err.toString());
    }
    expect(threw).to.equal(true);
  });

  it("AC-7: action=Hedge → NotImplemented", async () => {
    const action = { hedge: {} };
    let threw = false;
    try {
      await program.methods
        .executeRebalance(
          policyA,
          action as never,
          5_000,
          100,
          new BN(1_000),
          new BN(995),
        )
        .accounts({
          policy: policyA,
          guardianAuthority: guardian.publicKey,
        })
        .signers([guardian])
        .rpc();
    } catch (err: any) {
      threw = true;
      expect(/NotImplemented/i.test(err.toString())).to.equal(true, err.toString());
    }
    expect(threw).to.equal(true);
  });

  it("AC-6: action=Exit but slippage exceeds max_slippage_bps → SlippageTooHigh", async () => {
    // expected_out=1000, min_out=900, max_slippage=100 (1%).
    //   lhs = 900 * 10_000 = 9_000_000
    //   rhs = 1000 * (10_000 - 100) = 1000 * 9_900 = 9_900_000
    //   lhs < rhs  →  SlippageTooHigh
    const action = { exit: {} };
    let threw = false;
    try {
      await program.methods
        .executeRebalance(
          policyA,
          action as never,
          10_000,
          100,
          new BN(1_000),
          new BN(900),
        )
        .accounts({
          policy: policyA,
          guardianAuthority: guardian.publicKey,
        })
        .signers([guardian])
        .rpc();
    } catch (err: any) {
      threw = true;
      expect(/SlippageTooHigh/i.test(err.toString())).to.equal(true, err.toString());
    }
    expect(threw).to.equal(true);
  });

  it("AC-5: action=Exit, slippage in bound → succeeds, last_rebalanced.timestamp set", async () => {
    // expected_out=1000, min_out=995, max_slippage=100 (1%).
    //   lhs = 995 * 10_000 = 9_950_000
    //   rhs = 1000 * 9_900 = 9_900_000
    //   lhs >= rhs → ok
    const action = { exit: {} };
    await program.methods
      .executeRebalance(
        policyB,
        action as never,
        5_000,
        100,
        new BN(1_000),
        new BN(995),
      )
      .accounts({
        policy: policyB,
        guardianAuthority: guardian.publicKey,
      })
      .signers([guardian])
      .rpc();

    const [lrPda] = findLastRebalanced(policyB);
    const lr = await program.account.lastRebalanced.fetch(lrPda);
    expect(lr.timestamp.toNumber()).to.be.greaterThan(0);
  });

  it("AC-13: re-call within 30s → RebalanceTooSoon (B3 idempotency); state unchanged", async () => {
    const action = { exit: {} };
    const [lrPda] = findLastRebalanced(policyB);
    const before = await program.account.lastRebalanced.fetch(lrPda);
    const tsBefore = before.timestamp.toNumber();

    let threw = false;
    try {
      await program.methods
        .executeRebalance(
          policyB,
          action as never,
          5_000,
          100,
          new BN(1_000),
          new BN(995),
        )
        .accounts({
          policy: policyB,
          guardianAuthority: guardian.publicKey,
        })
        .signers([guardian])
        .rpc();
    } catch (err: any) {
      threw = true;
      expect(/RebalanceTooSoon/i.test(err.toString())).to.equal(true, err.toString());
    }
    expect(threw).to.equal(true);

    // Critically: timestamp did NOT advance — the rejected call must not
    // touch state.
    const after = await program.account.lastRebalanced.fetch(lrPda);
    expect(after.timestamp.toNumber()).to.equal(tsBefore);
  });
});
