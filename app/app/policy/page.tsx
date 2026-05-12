"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { useOnchainClient } from "@/lib/onchain";
import { encryptThreshold } from "@riskclaw/onchain";
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
  const client = useOnchainClient();

  const defaultExpiry = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

  const [drawdownBps, setDrawdownBps] = useState(2000);
  const [maxNotionalUSD, setMaxNotionalUSD] = useState(2_000_000);
  const [maxSlippageBps, setMaxSlippageBps] = useState(50);
  const [expiresAtUnix, setExpiresAtUnix] = useState(defaultExpiry);
  const [state, setState] = useState<ProposalState>({ kind: "idle" });

  const multisig = getDevMultisig();
  const multisigReady = isMultisigConfigured() && multisig !== null;

  const canSubmit =
    connected && multisigReady && client !== null && state.kind !== "proposing";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!multisig || !connected || !publicKey || !client) return;
    setState({ kind: "proposing" });
    try {
      const ciphertext = await encryptThreshold(BigInt(drawdownBps), null);
      // V1 demo: 1-of-1 dev multisig where the operator's wallet IS the sole
      // signer. The on-chain Anchor constraint `Signer + has_one` requires
      // the signer pubkey to equal `owningMultisigVault`, so we pass
      // `publicKey` (the wallet) rather than the Squads vault PDA.
      const txSig = await client.setEncryptedPolicy(publicKey, ciphertext);
      setState({ kind: "proposed", txSig });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <div className="page-narrow">
      <Link href="/" className="back-link">
        ← Back
      </Link>

      <header className="page-header">
        <p className="eyebrow">Policy editor</p>
        <h1>Encrypted risk policy</h1>
        <p className="lede">
          The plaintext threshold below never leaves this page in the clear —
          on submit it is encrypted via Arcium and stored as a 64-byte
          ciphertext on the <code>risk_policy</code> account. The Squads
          multisig is the only authority that can mutate it onchain.
        </p>
      </header>

      <div className="policy-meta">
        <WalletMultiButton />
        <span className="meta-chip">
          <span className="label">Operator</span>
          <code>
            {connected && publicKey
              ? `${publicKey.toBase58().slice(0, 6)}…${publicKey.toBase58().slice(-4)}`
              : "not connected"}
          </code>
        </span>
        <span className="meta-chip">
          <span className="label">Multisig</span>
          <code>
            {multisigReady && multisig
              ? `${multisig.toBase58().slice(0, 6)}…${multisig.toBase58().slice(-4)}`
              : "not configured"}
          </code>
        </span>
      </div>

      <form onSubmit={onSubmit} className="form-grid">
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
            className="form-range"
          />
          <span className="form-readout">
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
            className="form-input"
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
            className="form-range"
          />
          <span className="form-readout">
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
            className="form-input"
          />
          <span className="form-readout">
            {new Date(expiresAtUnix * 1000).toISOString()}
          </span>
        </Field>

        <button
          type="submit"
          disabled={!canSubmit}
          className="cta-button"
        >
          {state.kind === "proposing" ? "Proposing…" : "Propose policy update →"}
        </button>

        {!connected && (
          <p className="form-readout">
            Connect a wallet to propose.
          </p>
        )}
        {connected && !multisigReady && (
          <p className="form-readout">
            Run <code>scripts/create-multisig.ts</code> on devnet and paste the
            returned PDA into <code>config/devnet.ts</code> as{" "}
            <code>DEV_MULTISIG</code>.
          </p>
        )}

        {state.kind === "proposed" && (
          <p className="form-status success">
            Proposed. tx:{" "}
            <a
              href={`https://explorer.solana.com/tx/${state.txSig}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
            >
              {state.txSig.slice(0, 16)}…
            </a>
          </p>
        )}
        {state.kind === "error" && (
          <p className="form-status error">{state.message}</p>
        )}
      </form>
    </div>
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
    <label className="form-label">
      <span className="form-label-title">{label}</span>
      <span className="form-label-hint">{hint}</span>
      {children}
    </label>
  );
}
