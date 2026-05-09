"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { appStubClient } from "@/lib/onchain";
import { encryptThreshold } from "../../../packages/onchain/src/encrypt";
import { getDevMultisig, isMultisigConfigured } from "@/lib/squads";

const WalletMultiButton = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false },
);

type ProposalState =
  | { kind: "idle" }
  | { kind: "proposing" }
  | { kind: "proposed"; txSig: string }
  | { kind: "error"; message: string };

export default function PolicyEditor() {
  const { connected, publicKey } = useWallet();

  const defaultExpiry =
    Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

  const [drawdownBps, setDrawdownBps] = useState(2000);
  const [maxNotionalUSD, setMaxNotionalUSD] = useState(2_000_000);
  const [maxSlippageBps, setMaxSlippageBps] = useState(50);
  const [expiresAtUnix, setExpiresAtUnix] = useState(defaultExpiry);
  const [state, setState] = useState<ProposalState>({ kind: "idle" });

  const multisig = getDevMultisig();
  const multisigReady = isMultisigConfigured() && multisig !== null;

  const canSubmit = connected && multisigReady && state.kind !== "proposing";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!multisig || !connected) return;
    setState({ kind: "proposing" });
    try {
      const ciphertext = await encryptThreshold(BigInt(drawdownBps), null);
      const txSig = await appStubClient.setEncryptedPolicy(multisig, ciphertext);
      setState({ kind: "proposed", txSig });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6 p-8 sm:p-12">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← back
        </Link>
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          Policy editor
        </p>
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Encrypted risk policy
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500">
          The plaintext threshold below never leaves this page in the clear —
          on submit it is encrypted via Arcium and stored as a 64-byte
          ciphertext on the <code>risk_policy</code> account. The Squads
          multisig is the only authority that can mutate it onchain.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-4">
        <WalletMultiButton />
        <code className="font-mono text-[11px] text-zinc-500">
          {connected && publicKey
            ? `operator: ${publicKey.toBase58().slice(0, 8)}…${publicKey.toBase58().slice(-6)}`
            : "operator: not connected"}
        </code>
        <code className="font-mono text-[11px] text-zinc-500">
          {multisigReady && multisig
            ? `multisig: ${multisig.toBase58().slice(0, 8)}…${multisig.toBase58().slice(-6)}`
            : "multisig: not configured"}
        </code>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid max-w-2xl grid-cols-1 gap-5 rounded-lg border border-zinc-800 bg-zinc-950/40 p-6"
      >
        <Field
          label="Drawdown limit (bps)"
          hint="Trigger an EXIT when position drawdown crosses this. 10000 = 100%."
        >
          <input
            type="range"
            min={100}
            max={10_000}
            step={100}
            value={drawdownBps}
            onChange={(e) => setDrawdownBps(Number(e.target.value))}
            className="w-full"
          />
          <span className="font-mono text-xs text-zinc-300">
            {drawdownBps} bps ({(drawdownBps / 100).toFixed(2)}%)
          </span>
        </Field>

        <Field
          label="Max notional (USD)"
          hint="Position size cap above which the Guardian refuses to enter."
        >
          <input
            type="number"
            min={0}
            step={50_000}
            value={maxNotionalUSD}
            onChange={(e) => setMaxNotionalUSD(Number(e.target.value))}
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
          />
        </Field>

        <Field
          label="Max slippage (bps)"
          hint="Onchain slippage gate enforced by swig_delegation::execute_rebalance."
        >
          <input
            type="range"
            min={0}
            max={1_000}
            step={5}
            value={maxSlippageBps}
            onChange={(e) => setMaxSlippageBps(Number(e.target.value))}
            className="w-full"
          />
          <span className="font-mono text-xs text-zinc-300">
            {maxSlippageBps} bps ({(maxSlippageBps / 100).toFixed(2)}%)
          </span>
        </Field>

        <Field
          label="Expires at (unix)"
          hint="Delegation auto-expires; operator must re-propose."
        >
          <input
            type="number"
            min={0}
            value={expiresAtUnix}
            onChange={(e) => setExpiresAtUnix(Number(e.target.value))}
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
          />
          <span className="font-mono text-[11px] text-zinc-500">
            {new Date(expiresAtUnix * 1000).toISOString()}
          </span>
        </Field>

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-emerald-50 transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {state.kind === "proposing" ? "Proposing…" : "Propose policy update"}
        </button>

        {!connected && (
          <p className="text-xs text-amber-300/90">
            Connect a wallet to propose.
          </p>
        )}
        {connected && !multisigReady && (
          <p className="text-xs text-amber-300/90">
            Run <code>scripts/create-multisig.ts</code> on devnet and paste the
            returned PDA into <code>config/devnet.ts</code> as{" "}
            <code>DEV_MULTISIG</code>.
          </p>
        )}

        {state.kind === "proposed" && (
          <p className="rounded-md border border-emerald-700/50 bg-emerald-950/30 px-3 py-2 font-mono text-[11px] text-emerald-300">
            Proposed. tx (stub): {state.txSig}
          </p>
        )}
        {state.kind === "error" && (
          <p className="rounded-md border border-red-700/50 bg-red-950/30 px-3 py-2 font-mono text-[11px] text-red-300">
            {state.message}
          </p>
        )}
      </form>
    </main>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-zinc-200">{label}</span>
      <span className="text-xs text-zinc-500">{hint}</span>
      {children}
    </label>
  );
}
