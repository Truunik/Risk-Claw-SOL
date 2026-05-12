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
  { label: string; dot: string; rule: string }
> = {
  read: {
    label: "READ",
    dot: "zone-dot",
    rule: "Helius LaserStream consumer. No signing key, no policy access.",
  },
  compute: {
    label: "COMPUTE",
    dot: "zone-dot outline",
    rule: "Calls Arcium MPC; receives only {breached, score}. Never decrypts.",
  },
  execute: {
    label: "EXECUTE",
    dot: "zone-dot split",
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
    <div className="page">
      <Link href="/" className="back-link">
        ← Back
      </Link>

      <header className="page-header">
        <p className="eyebrow">Audit trail</p>
        <h1>Every action signed. Every delegation traceable.</h1>
        <p className="lede">
          Three agent zones with distinct keypairs. The Analyst is the only
          caller of <code>queue_threshold_check</code> (PRD §9 G1); the
          Guardian is the only signer of <code>execute_rebalance</code>,
          bounded by Swig delegation. The plaintext threshold never appears
          in any of these events — only <code>{`{breached, score}`}</code>.
        </p>
        <p className="meta-chip" style={{ marginTop: "1rem" }}>
          <span className={`status-dot${wallet && listening ? " live" : ""}`} />
          <span className="label">Subscribed</span>
          <code>
            {wallet
              ? listening
                ? "listening — swig_delegation::RebalanceExecutedEvent"
                : "subscribing…"
              : "connect a wallet to subscribe"}
          </code>
        </p>
      </header>

      <section className="zone-grid" style={{ marginBottom: "2rem" }}>
        {AGENTS.map((agent) => {
          const copy = ZONE_COPY[agent.zone];
          return (
            <article key={agent.pubkey} className="zone-card">
              <span className="zone-tag">
                <span className={copy.dot} />
                {copy.label}
              </span>
              <div className="zone-name">{agent.name}</div>
              <code>pubkey {shortenSig(agent.pubkey)}</code>
              <code>
                core{" "}
                <a
                  href={`https://explorer.solana.com/address/${agent.coreMint}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: "underline" }}
                >
                  {shortenSig(agent.coreMint)}
                </a>
              </code>
              <p className="zone-rule">{copy.rule}</p>
            </article>
          );
        })}
      </section>

      <section style={{ overflowX: "auto" }}>
        <table className="audit-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Event</th>
              <th>Detail</th>
              <th>Signer</th>
              <th>Policy</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty">
                  Waiting for the first <code>RebalanceExecutedEvent</code>…
                  trigger one via <code>bun run e2e-smoke</code> or the paired
                  devnet flow.
                </td>
              </tr>
            ) : (
              sorted.map((e, i) => <EventRow key={`${e.ts}-${i}`} event={e} />)
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function EventRow({ event }: { event: AuditEvent }) {
  const ts = new Date(event.ts).toISOString().replace("T", " ").slice(0, 19);
  if (event.kind !== "rebalance-executed") {
    return null;
  }
  return (
    <tr>
      <td>{ts}</td>
      <td>rebalance executed</td>
      <td>
        {event.action} {event.sizeBps}bps
      </td>
      <td>guardian {shortenSig(event.guardian)}</td>
      <td>{shortenSig(event.policyHash)}</td>
    </tr>
  );
}
