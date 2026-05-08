"use client";

import Link from "next/link";
import { useMemo } from "react";

import {
  AuditEvent,
  DEMO_AGENTS,
  generateDemoEvents,
  shortenSig,
} from "@/lib/audit";

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

export default function AuditPage() {
  const events = useMemo<AuditEvent[]>(() => generateDemoEvents(), []);

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
        <p className="rounded-md border border-amber-700/40 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-200/90">
          Demo data — synthetic events generated client-side. Replace with
          program event subscription when Builder B ships{" "}
          <code>ThresholdCheckEvent</code> + <code>RebalanceExecutedEvent</code>.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        {DEMO_AGENTS.map((agent) => {
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
                core   {shortenSig(agent.coreMint)}
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
              <th className="px-4 py-3">Tx</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {events.map((e, i) => (
              <EventRow key={`${e.ts}-${i}`} event={e} />
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function EventRow({ event }: { event: AuditEvent }) {
  const ts = new Date(event.ts).toISOString().replace("T", " ").slice(0, 19);
  switch (event.kind) {
    case "agent-registered":
      return (
        <tr className="text-zinc-300">
          <td className="px-4 py-3 font-mono text-zinc-500">{ts}</td>
          <td className="px-4 py-3">agent registered</td>
          <td className="px-4 py-3 text-zinc-400">
            zone <span className="text-zinc-200">{event.agent.zone}</span> · {" "}
            <code className="font-mono text-[11px]">
              {shortenSig(event.agent.coreMint)}
            </code>
          </td>
          <td className="px-4 py-3 font-mono text-[11px] text-zinc-400">—</td>
          <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">
            registry mint
          </td>
        </tr>
      );
    case "policy-set":
      return (
        <tr className="text-zinc-300">
          <td className="px-4 py-3 font-mono text-zinc-500">{ts}</td>
          <td className="px-4 py-3 text-emerald-300">policy set</td>
          <td className="px-4 py-3 text-zinc-400">
            policyHash <span className="text-zinc-200">{event.policyHash}</span>
          </td>
          <td className="px-4 py-3 font-mono text-[11px] text-zinc-400">
            vault {shortenSig(event.signedBy)}
          </td>
          <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">
            {shortenSig(event.txSig)}
          </td>
        </tr>
      );
    case "threshold-check":
      return (
        <tr
          className={
            event.breached ? "text-amber-200" : "text-zinc-300"
          }
        >
          <td className="px-4 py-3 font-mono text-zinc-500">{ts}</td>
          <td className="px-4 py-3">
            {event.breached ? (
              <span className="text-amber-300">threshold check (breached)</span>
            ) : (
              <span className="text-zinc-400">threshold check</span>
            )}
          </td>
          <td className="px-4 py-3 text-zinc-400">
            score <span className="text-zinc-200">{event.score}</span> ·{" "}
            breached={" "}
            <span
              className={event.breached ? "text-amber-300" : "text-zinc-500"}
            >
              {String(event.breached)}
            </span>
          </td>
          <td className="px-4 py-3 font-mono text-[11px] text-zinc-400">
            analyst {shortenSig(event.analyst)}
          </td>
          <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">
            {shortenSig(event.txSig)}
          </td>
        </tr>
      );
    case "rebalance-executed":
      return (
        <tr className="text-emerald-200">
          <td className="px-4 py-3 font-mono text-emerald-400/70">{ts}</td>
          <td className="px-4 py-3 text-emerald-300">rebalance executed</td>
          <td className="px-4 py-3 text-emerald-300/80">
            {event.action} {event.sizeBps}bps · slippage {event.slippageBps}bps
          </td>
          <td className="px-4 py-3 font-mono text-[11px] text-emerald-400/80">
            guardian {shortenSig(event.guardian)}
          </td>
          <td className="px-4 py-3 font-mono text-[11px] text-emerald-400/70">
            {shortenSig(event.txSig)}
          </td>
        </tr>
      );
  }
}
