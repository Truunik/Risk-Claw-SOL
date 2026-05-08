"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";

const WalletMultiButton = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false },
);

export default function Home() {
  const { publicKey, connected } = useWallet();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-12 text-center">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          RiskClaw-Sol — Operator Console
        </p>
        <h1 className="text-3xl font-semibold sm:text-4xl">
          Audit-grade autonomous policy enforcement
        </h1>
        <p className="max-w-xl text-sm text-zinc-500">
          Treasury operators connect a Phantom wallet to author and update
          encrypted risk policies. Devnet only.
        </p>
      </header>

      <WalletMultiButton />

      {connected && publicKey ? (
        <section className="rounded-md border border-zinc-800 bg-zinc-950/50 px-4 py-3 font-mono text-xs text-zinc-300">
          <span className="text-zinc-500">Connected pubkey: </span>
          {publicKey.toBase58()}
        </section>
      ) : (
        <p className="text-xs text-zinc-500">
          No wallet connected. Devnet network expected.
        </p>
      )}

      {connected && (
        <nav className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/policy"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-emerald-50 transition-colors hover:bg-emerald-500"
          >
            Open policy editor →
          </Link>
          <Link
            href="/audit"
            className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:text-zinc-50"
          >
            View audit trail →
          </Link>
        </nav>
      )}
    </main>
  );
}
