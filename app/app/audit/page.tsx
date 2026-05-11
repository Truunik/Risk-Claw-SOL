"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  useAnchorWallet,
  useConnection,
} from "@solana/wallet-adapter-react";
import * as anchor from "@anchor-lang/core";

import {
  AGENT_REGISTRY,
  swigDelegationIdl,
} from "@riskclaw/onchain";
import { AuditEvent, shortenSig } from "@/lib/audit";

const ZONE_COPY: Record<
  "read" | "compute" | "execute",
  { label: string; tint: string; rule: string }
> = {
  read: {
    label: "READ",
    tint: "text-sky-300 border-sky-500/30 bg-sky-950/30",
    rule: "Helius LaserStream consumer. No signing key, no policy access.",
  },
  compute: {
    label: "COMPUTE",
    tint: "text-violet-300 border-violet-500/30 bg-violet-950/30",
    rule: "Calls Arcium MPC; receives only {breached, score}. Never decrypts.",
  },
  execute: {
    label: "EXECUTE",
    tint: "text-emerald-300 border-emerald-500/30 bg-emerald-950/30",
    rule: "Holds the only signing key. Bounded by Swig delegation onchain.",
  },
};

const AGENTS: Array<{
  zone: "read" | "compute" | "execute";
  name: string;
  pubkey: string;
  coreMint: string;
}> = [
  {
    zone: "read",
    name: AGENT_REGISTRY.read.name,
    pubkey: AGENT_REGISTRY.read.pubkey.toBase58(),
    coreMint: AGENT_REGISTRY.read.mint.toBase58(),
  },
  {
    zone: "compute",
    name: AGENT_REGISTRY.compute.name,
    pubkey: AGENT_REGISTRY.compute.pubkey.toBase58(),
    coreMint: AGENT_REGISTRY.compute.mint.toBase58(),
  },
  {
    zone: "execute",
    name: AGENT_REGISTRY.execute.name,
    pubkey: AGENT_REGISTRY.execute.pubkey.toBase58(),
    coreMint: AGENT_REGISTRY.execute.mint.toBase58(),
  },
];

export default function AuditPage() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!wallet) {
      setListening(false);
      return;
    }
    const provider = new anchor.AnchorProvider(
      connection,
      wallet as never,
      { commitment: "confirmed" },
    );
    const swig = new anchor.Program(swigDelegationIdl as never, provider);

    const id = swig.addEventListener(
      "rebalanceExecutedEvent",
      (event: unknown) => {
        const e = event as {
          policy: { toBase58(): string };
          guardianAuthority: { toBase58(): string };
          action: Record<string, unknown>;
          sizeBps: number;
          ts: anchor.BN;
        };
        setEvents((prev) => [
          {
            kind: "rebalance-executed",
            ts: e.ts.toNumber() * 1000,
            policyHash: e.policy.toBase58(),
            action: "EXIT",
            sizeBps: e.sizeBps,
            slippageBps: 0,
            guardian: e.guardianAuthority.toBase58(),
            txSig: "(see explorer — RebalanceExecutedEvent)",
          },
          ...prev,
        ]);
      },
    );
    setListening(true);
    return () => {
      void swig.removeEventListener(id);
      setListening(false);
    };
  }, [wallet, connection]);

  const sorted = useMemo(
    () => [...events].sort((a, b) => b.ts - a.ts),
    [events],
  );

  return (
    <main className="flex flex-1 flex-col gap-8 p-8 sm:p-12">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← back
        </Link>
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
          Audit trail
        </p>
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Every action signed, every delegation traceable
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500">
          Three agent zones with distinct keypairs. The Analyst is the only
          caller of <code>queue_threshold_check</code> (PRD §9 G1); the
          Guardian is the only signer of <code>execute_rebalance</code>,
          bounded by Swig delegation. The plaintext threshold never appears
          in any of these events — only <code>{`{breached, score}`}</code>.
        </p>
        <p className="rounded-md border border-zinc-700/40 bg-zinc-900/40 px-3 py-2 text-[11px] text-zinc-300">
          Live: subscribed to <code>RebalanceExecutedEvent</code> on{" "}
          <code>swig_delegation</code>. Status:{" "}
          {wallet
            ? listening
              ? <span className="text-emerald-300">listening</span>
              : <span className="text-amber-300">subscribing…</span>
            : <span className="text-amber-300">connect a wallet to subscribe</span>}
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {AGENTS.map((agent) => {
          const copy = ZONE_COPY[agent.zone];
          return (
            <article
              key={agent.pubkey}
              className={`flex flex-col gap-2 rounded-lg border px-4 py-4 ${copy.tint}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                  {copy.label}
                </span>
                <span className="text-xs text-zinc-300">{agent.name}</span>
              </div>
              <code className="font-mono text-[11px] text-zinc-300">
                pubkey {shortenSig(agent.pubkey)}
              </code>
              <code className="font-mono text-[11px] text-zinc-400">
                core{" "}
                <a
                  href={`https://explorer.solana.com/address/${agent.coreMint}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-zinc-200"
                >
                  {shortenSig(agent.coreMint)}
                </a>
              </code>
              <p className="text-[11px] text-zinc-400">{copy.rule}</p>
            </article>
          );
        })}
      </section>

      <section className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/40">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-900/60 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Detail</th>
              <th className="px-4 py-3">Signer</th>
              <th className="px-4 py-3">Policy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  Waiting for the first <code>RebalanceExecutedEvent</code>…
                  trigger one via <code>bun run e2e-smoke</code> or the
                  paired devnet flow.
                </td>
              </tr>
            ) : (
              sorted.map((e, i) => <EventRow key={`${e.ts}-${i}`} event={e} />)
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function EventRow({ event }: { event: AuditEvent }) {
  const ts = new Date(event.ts).toISOString().replace("T", " ").slice(0, 19);
  if (event.kind !== "rebalance-executed") {
    return null;
  }
  return (
    <tr className="text-emerald-200">
      <td className="px-4 py-3 font-mono text-emerald-400/70">{ts}</td>
      <td className="px-4 py-3 text-emerald-300">rebalance executed</td>
      <td className="px-4 py-3 text-emerald-300/80">
        {event.action} {event.sizeBps}bps
      </td>
      <td className="px-4 py-3 font-mono text-[11px] text-emerald-400/80">
        guardian {shortenSig(event.guardian)}
      </td>
      <td className="px-4 py-3 font-mono text-[11px] text-emerald-400/70">
        {shortenSig(event.policyHash)}
      </td>
    </tr>
  );
}
