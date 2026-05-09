// app/lib/audit.ts
// Audit-trail event types + a synthetic event generator for the v1 demo.
//
// When Builder B ships:
//  - risk_policy emits ThresholdCheckEvent on every queue_threshold_check fire
//  - swig_delegation emits RebalanceExecutedEvent on every execute_rebalance
//  - register-agents.ts mints Core NFTs whose Attributes include the zone
// Replace the synthetic generator with a Solana program event subscription
// (anchor's program.addEventListener) reading the same shapes.

export type AgentIdentity = {
  zone: "read" | "compute" | "execute";
  name: string;
  pubkey: string;
  coreMint: string;
};

export type AuditEvent =
  | {
      kind: "agent-registered";
      ts: number;
      agent: AgentIdentity;
    }
  | {
      kind: "policy-set";
      ts: number;
      policyHash: string;
      multisig: string;
      signedBy: string; // multisig vault PDA
      txSig: string;
    }
  | {
      kind: "threshold-check";
      ts: number;
      policyHash: string;
      breached: boolean;
      score: number;
      analyst: string; // analyst agent pubkey
      txSig: string;
    }
  | {
      kind: "rebalance-executed";
      ts: number;
      policyHash: string;
      action: "EXIT";
      sizeBps: number;
      slippageBps: number;
      guardian: string;
      txSig: string;
    };

export const DEMO_AGENTS: AgentIdentity[] = [
  {
    zone: "read",
    name: "Observer",
    pubkey: "Obs7HfXFqNcPgxnY8RqShK4HmoQYBcMx9LTuDUYpDQne",
    coreMint: "Mp1Core1Read1KTuRvUHxhzqBs2Lo4eFhyQX3K5n8mE7v",
  },
  {
    zone: "compute",
    name: "Analyst",
    pubkey: "Anlys9mKqcLvDz3xWsTpQbZf6HuWjY4N7sR8tJpV3CdH",
    coreMint: "Mp1Core1Cmpt1NhCmTYbjW2QqPp6kS8L4mUnXh3yZxA9d",
  },
  {
    zone: "execute",
    name: "Guardian",
    pubkey: "Grd1aN5tUz7HQpYuJ4xVeF8rW2Db6CMnLpKsRq3vEhBg",
    coreMint: "Mp1Core1Exec1Bz9LpWxRkV2yT7dF4gM5qH8jSnA6cE3K",
  },
];

const POLICY_HASH = "0x9f3c…b27e";
const MULTISIG = "MS9o5fZ8tKbqLp3rYxV2DnW7HuJqA4mC6kP1eR8gXt";
const VAULT = "Vlt7hY4mLpXq9DrZb3KuTcF5gNs8RjW2eBmA6tH1xPy";

function fakeSig(seed: string): string {
  // base58-ish 88-char-ish stub. Just for visual variety.
  const a = `${seed}_${Math.random().toString(36).slice(2, 10)}`;
  return `${a}${"x".repeat(Math.max(0, 64 - a.length))}`.slice(0, 88);
}

export function generateDemoEvents(now: number = Date.now()): AuditEvent[] {
  const events: AuditEvent[] = [];

  // t-2h: register the three agents.
  const registerAt = now - 2 * 60 * 60 * 1000;
  DEMO_AGENTS.forEach((agent, i) => {
    events.push({
      kind: "agent-registered",
      ts: registerAt + i * 30_000,
      agent,
    });
  });

  // t-1h45m: multisig sets the encrypted policy.
  events.push({
    kind: "policy-set",
    ts: now - 1 * 60 * 60 * 1000 - 45 * 60 * 1000,
    policyHash: POLICY_HASH,
    multisig: MULTISIG,
    signedBy: VAULT,
    txSig: fakeSig("policy-set"),
  });

  // Threshold checks every 5 minutes for the last hour. Most pass.
  // One breach at ~t-30m fires the EXIT.
  const analyst = DEMO_AGENTS[1]!;
  const guardian = DEMO_AGENTS[2]!;
  for (let m = 60; m >= 5; m -= 5) {
    const breached = m === 30;
    const score = Math.round(800 + Math.random() * 1500 + (breached ? 1500 : 0));
    const ts = now - m * 60 * 1000;
    events.push({
      kind: "threshold-check",
      ts,
      policyHash: POLICY_HASH,
      breached,
      score,
      analyst: analyst.pubkey,
      txSig: fakeSig(`check-${m}`),
    });
    if (breached) {
      events.push({
        kind: "rebalance-executed",
        ts: ts + 1_500,
        policyHash: POLICY_HASH,
        action: "EXIT",
        sizeBps: 10_000,
        slippageBps: 25,
        guardian: guardian.pubkey,
        txSig: fakeSig("exit"),
      });
    }
  }

  return events.sort((a, b) => b.ts - a.ts);
}

export function shortenSig(s: string, head = 6, tail = 6): string {
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}
