// RealClient — production implementation of the OnchainClient boundary
// (PRD §2.4 + §5). Consumed by Builder A's app and agent loop.
//
// This file ships real onchain behavior for setEncryptedPolicy and
// executePrivateRebalance, plus the FR-5b read throttle cache and FR-8b
// write idempotency catch. Methods gated on later PRD tasks throw
// NotImplementedError with explicit task pointers.

import * as anchor from "@anchor-lang/core";
import type { Program, AnchorProvider } from "@anchor-lang/core";
import type { Connection, PublicKey, TransactionSignature } from "@solana/web3.js";

import type {
  AgentConfig,
  DelegationPolicy,
  MintAddress,
  PositionMetrics,
  RebalancePlan,
  ThresholdCheckResult,
  TxSig,
} from "../../../agents/src/types";
import type { OnchainClient } from "../../../agents/src/onchain-client";
import {
  ArciumClusterUnavailableError,
  NotImplementedError,
  OnchainRejectionError,
  SlippageRejectedError,
} from "./errors";
import {
  AGENT_REGISTRY,
  RISK_POLICY_PROGRAM_ID,
  SWIG_DELEGATION_PROGRAM_ID,
  deriveLastRebalancedPda,
  deriveRiskPolicyPda,
} from "./ids";
import type { AgentZone } from "./ids";

const { BN, web3 } = anchor;

// ---------- factory + options ----------

export type CreateRealClientOpts = {
  connection: Connection;
  /** AnchorProvider's wallet — signs txs. For v1 demo this is also used as
   *  the Squads vault signer (1-of-1 multisig where the only member is the
   *  test keypair). Real institutional flow uses Squads UI. */
  wallet: anchor.Wallet;
  cluster: "devnet";
  /** Override MXE cluster pubkey for the encrypted-threshold envelope.
   *  Defaults to MXE_CLUSTER_PUBKEY from `./encrypt`. */
  arciumClusterPubkey?: PublicKey;
  /** Read-side throttle window in ms (FR-5b). Default 5_000. */
  readThrottleMs?: number;
  /** Write-side idempotency window in ms (FR-8b). Default 30_000. */
  writeThrottleMs?: number;
  /** Anchor IDLs (loaded by deploy-devnet.ts). Skip if you don't need
   *  set/execute methods — they'll throw with a clear message. */
  riskPolicyIdl?: anchor.Idl;
  swigDelegationIdl?: anchor.Idl;
};

export function createRealClient(opts: CreateRealClientOpts): OnchainClient {
  return new RealClient(opts);
}

// ---------- the real client ----------

class RealClient implements OnchainClient {
  private readonly provider: AnchorProvider;
  private readonly readThrottleMs: number;
  private readonly writeThrottleMs: number;
  private readonly riskPolicy: Program | null;
  private readonly swigDelegation: Program | null;

  // FR-5b read throttle: last successful checkThresholdBreach result per policy.
  private readonly readCache = new Map<
    string,
    { lastCheckedAt: number; lastResult: ThresholdCheckResult }
  >();

  // FR-8b write idempotency: last successful executePrivateRebalance TxSig per policy.
  private readonly writeCache = new Map<
    string,
    { lastTxSig: TxSig; lastExecutedAt: number }
  >();

  constructor(opts: CreateRealClientOpts) {
    this.provider = new anchor.AnchorProvider(opts.connection, opts.wallet, {
      commitment: "confirmed",
    });
    this.readThrottleMs = opts.readThrottleMs ?? 5_000;
    this.writeThrottleMs = opts.writeThrottleMs ?? 30_000;
    this.riskPolicy = opts.riskPolicyIdl
      ? new anchor.Program(opts.riskPolicyIdl, this.provider)
      : null;
    this.swigDelegation = opts.swigDelegationIdl
      ? new anchor.Program(opts.swigDelegationIdl, this.provider)
      : null;
  }

  // ---------- setEncryptedPolicy ----------

  /**
   * PRD §2.4 FR-1 (convenience path) — for v1 demo: uses the AnchorProvider's
   * wallet as the multisig signer (1-of-1 dev multisig). Production
   * institutional flow goes through `buildSetEncryptedPolicyIx` + Squads UI.
   *
   * If the policy PDA already exists, calls `update_policy`; else `init_policy`.
   */
  async setEncryptedPolicy(
    multisig: PublicKey,
    ciphertext: Uint8Array,
  ): Promise<TxSig> {
    if (!this.riskPolicy || !RISK_POLICY_PROGRAM_ID) {
      throw new NotImplementedError(
        "setEncryptedPolicy requires riskPolicyIdl + RISK_POLICY_PROGRAM_ID — run deploy-devnet.ts",
      );
    }
    if (ciphertext.length !== 64) {
      throw new OnchainRejectionError(
        `ciphertext must be 64 bytes (got ${ciphertext.length})`,
      );
    }

    const [policyPda] = deriveRiskPolicyPda(multisig);
    const arciumHandle = new Uint8Array(32); // v1: zeros until C-14 deploys real handle
    const exists = await this.provider.connection.getAccountInfo(policyPda);

    try {
      const sig = exists
        ? await this.riskPolicy.methods
            .updatePolicy(Array.from(ciphertext), Array.from(arciumHandle))
            .accounts({ owningMultisigVault: multisig })
            .rpc()
        : await this.riskPolicy.methods
            .initPolicy(Array.from(ciphertext), Array.from(arciumHandle))
            .accounts({ owningMultisigVault: multisig })
            .rpc();
      return sig as TxSig;
    } catch (err: unknown) {
      throw new OnchainRejectionError(
        `setEncryptedPolicy ${exists ? "update" : "init"} failed`,
        err,
      );
    }
  }

  // ---------- delegateToGuardian (deferred) ----------

  async delegateToGuardian(
    _multisig: PublicKey,
    _guardian: PublicKey,
    _policy: DelegationPolicy,
  ): Promise<TxSig> {
    throw new NotImplementedError(
      "delegateToGuardian — Pkg-19 (Q2 spike: Swig SDK API)",
    );
  }

  // ---------- checkThresholdBreach (FR-5b cache + v1 stub) ----------

  /**
   * V1 implementation note: Arcium runtime wiring lands in C-14. Until then,
   * this returns a deterministic stub based on observed drawdown so Builder A's
   * agent loop has something to fire against (drift curve crosses ~3000bps;
   * we breach at >= 2500bps for demo signal).
   *
   * The FR-5b throttle cache is REAL — that's the architecturally interesting
   * piece. Builder A's tick-driven Analyst loop is correct under it.
   */
  async checkThresholdBreach(
    positionId: string,
    metrics: PositionMetrics,
  ): Promise<ThresholdCheckResult> {
    const now = Date.now();
    const cached = this.readCache.get(positionId);
    if (cached && now - cached.lastCheckedAt < this.readThrottleMs) {
      return cached.lastResult;
    }

    // V1 stub: derive a deterministic mock from `drawdownBps` only — never
    // a function of any (encrypted) threshold. Privacy invariant preserved.
    const result: ThresholdCheckResult = {
      breached: metrics.drawdownBps >= 2500,
      score: metrics.notionalUSD,
    };
    this.readCache.set(positionId, { lastCheckedAt: now, lastResult: result });
    return result;
  }

  // ---------- executePrivateRebalance (FR-8b idempotency catch) ----------

  async executePrivateRebalance(plan: RebalancePlan): Promise<TxSig> {
    if (plan.action === "REDUCE" || plan.action === "HEDGE") {
      throw new NotImplementedError(
        `executePrivateRebalance action="${plan.action}" (only EXIT ships in v1)`,
      );
    }
    if (!this.swigDelegation || !SWIG_DELEGATION_PROGRAM_ID) {
      throw new NotImplementedError(
        "executePrivateRebalance requires swigDelegationIdl + SWIG_DELEGATION_PROGRAM_ID — run deploy-devnet.ts",
      );
    }

    const policyPubkey = new web3.PublicKey(plan.positionId);
    const [lastRebalancedPda] = deriveLastRebalancedPda(policyPubkey);

    // Conservative client-side write-cache check: if we KNOW we executed
    // recently, skip the RPC roundtrip. Onchain B3 still enforces; this is
    // a perf/UX shortcut. See PRD FR-8b.
    const cachedWrite = this.writeCache.get(plan.positionId);
    if (cachedWrite && Date.now() - cachedWrite.lastExecutedAt < this.writeThrottleMs) {
      return cachedWrite.lastTxSig;
    }

    // V1 demo numbers — caller should pass real Orca quote in v2.
    const expectedOut = new BN(1_000);
    const minOut = new BN(995);
    const maxSlippageBps = 100; // 1%

    try {
      const sig = await this.swigDelegation.methods
        .executeRebalance(
          policyPubkey,
          { exit: {} } as never,
          plan.sizeBps,
          maxSlippageBps,
          expectedOut,
          minOut,
        )
        .accounts({ policy: policyPubkey })
        .rpc();
      this.writeCache.set(plan.positionId, {
        lastTxSig: sig as TxSig,
        lastExecutedAt: Date.now(),
      });
      return sig as TxSig;
    } catch (err: unknown) {
      const msg = String(err);
      // FR-8b: catch onchain RebalanceTooSoon and resolve with prior TxSig.
      if (/RebalanceTooSoon/i.test(msg) && cachedWrite) {
        return cachedWrite.lastTxSig;
      }
      if (/SlippageTooHigh/i.test(msg)) {
        throw new SlippageRejectedError("onchain slippage gate rejected", err);
      }
      if (/NotImplemented/i.test(msg)) {
        throw new NotImplementedError(plan.action, err);
      }
      throw new OnchainRejectionError("executePrivateRebalance failed", err);
    }
  }

  // ---------- registerAgent (Pkg-20) ----------

  /**
   * V1 semantic: agents are pre-registered on devnet by
   * `scripts/register-agents.ts` (one Metaplex Core NFT per zone). This
   * resolves the on-chain mint for a given zone and validates that the
   * caller's expected signer pubkey matches the registered owner — a stale
   * config on the caller's side is louder than silently returning the wrong
   * mint. Runtime minting / rotation is v2 (not in scope for the hackathon).
   */
  async registerAgent(agent: AgentConfig): Promise<MintAddress> {
    const entry = AGENT_REGISTRY[agent.zone as AgentZone];
    if (!entry) {
      throw new OnchainRejectionError(
        `no registered agent for zone="${agent.zone}" — run scripts/register-agents.ts`,
      );
    }
    if (!entry.pubkey.equals(agent.publicKey)) {
      throw new OnchainRejectionError(
        `zone="${agent.zone}" pubkey mismatch: registry has ${entry.pubkey.toBase58()}, ` +
          `caller passed ${agent.publicKey.toBase58()} — caller config is stale`,
      );
    }
    return entry.mint;
  }

  // ---------- diagnostics (test-only) ----------

  /** Visible to tests for asserting cache state without poking through Map. */
  _getReadCacheSize(): number {
    return this.readCache.size;
  }
  _getWriteCacheSize(): number {
    return this.writeCache.size;
  }
  _clearCaches(): void {
    this.readCache.clear();
    this.writeCache.clear();
  }
  /** ArciumTimeoutError / ClusterUnavailable lints — referenced once so the
   *  imports aren't unused under noUnusedLocals. C-14 invokes them for real. */
  static _arciumErrorTypesReferenced = ArciumClusterUnavailableError;
}

export { RealClient };
