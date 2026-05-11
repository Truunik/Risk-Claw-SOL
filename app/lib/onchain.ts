// app/lib/onchain.ts
//
// Real-client binding for the operator app. Replaces the local
// `appStubClient` with `@riskclaw/onchain::createRealClient` bound to the
// connected Phantom wallet + Connection + bundled program IDLs. Re-exports
// shared types so existing import sites in /app keep compiling without an
// app-wide find/replace.
//
// Boundary invariant (CLAUDE.md hard rule): /app must NOT open its own
// Connection, call sendTransaction, or hold a signing Keypair. All that
// lives behind `createRealClient` — this hook is just the React-friendly
// adapter that hands the wallet + connection to the package.

import { useMemo } from "react";
import { Connection } from "@solana/web3.js";
import {
  useAnchorWallet,
  useConnection,
} from "@solana/wallet-adapter-react";
import {
  createRealClient,
  riskPolicyIdl,
  swigDelegationIdl,
  type OnchainClient,
} from "@riskclaw/onchain";

// Re-export the shared types so existing app imports (`import type { ... }
// from "@/lib/onchain"`) keep working.
export type {
  DelegationPolicy,
  MintAddress,
  OnchainClient,
  PositionMetrics,
  RebalancePlan,
  ThresholdCheckResult,
  TxSig,
} from "@riskclaw/onchain";

/**
 * Returns a real `OnchainClient` bound to the connected Phantom wallet +
 * Solana devnet RPC + bundled IDLs. Returns `null` while no wallet is
 * connected — callers should guard before use.
 *
 * Stable across renders for the same (wallet, connection) pair.
 */
export function useOnchainClient(): OnchainClient | null {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  return useMemo(() => {
    if (!wallet) return null;
    return createRealClient({
      connection: connection as Connection,
      // AnchorWallet shape (publicKey + signTransaction + signAllTransactions)
      // is a subset of anchor.Wallet — the package only uses these three
      // members. Type cast keeps both ends honest without dragging anchor
      // types into every page.
      wallet: wallet as never,
      cluster: "devnet",
      riskPolicyIdl: riskPolicyIdl as never,
      swigDelegationIdl: swigDelegationIdl as never,
    });
  }, [wallet, connection]);
}
