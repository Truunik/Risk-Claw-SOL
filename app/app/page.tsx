"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";

const WalletMultiButton = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false },
);

const STATS = [
  { value: "100%", label: "On-chain enforcement" },
  { value: "0", label: "Plaintext leaked" },
  { value: "3", label: "Sealed agent zones" },
];

const ZONES = [
  {
    tag: "READ",
    dot: "zone-dot",
    name: "Observer",
    rule: "Helius LaserStream consumer. No signing key. No policy access.",
  },
  {
    tag: "COMPUTE",
    dot: "zone-dot outline",
    name: "Analyst",
    rule: "Calls Arcium MPC. Receives only {breached, score}. Never decrypts.",
  },
  {
    tag: "EXECUTE",
    dot: "zone-dot split",
    name: "Guardian",
    rule: "Holds the only signing key. Bounded by Swig delegation onchain.",
  },
];

export default function Home() {
  const { publicKey, connected } = useWallet();

  return (
    <div className="page">
      <section className="landing-hero">
        <Image
          src="/riskclaw-logo.png"
          alt="RiskClaw shield"
          width={120}
          height={120}
          className="shield-mark"
          priority
        />
        <p className="eyebrow">Audit · Autonomous · Private</p>
        <h1>RISKCLAW</h1>
        <p className="subtitle">Onchain Policy. Sealed Enforcement.</p>
        <p className="description">
          Treasury operators encrypt a risk threshold once. Three sealed agent
          zones read, compute, and execute — without any of them ever seeing
          the plaintext. Squads-signed, Swig-delegated, Arcium-sealed.
        </p>

        <div className="hero-actions">
          <WalletMultiButton />
        </div>

        <div className="hero-status">
          {connected && publicKey ? (
            <span className="meta-chip">
              <span className="status-dot" />
              <span className="label">Operator</span>
              <code>
                {publicKey.toBase58().slice(0, 6)}…
                {publicKey.toBase58().slice(-4)}
              </code>
            </span>
          ) : (
            <span className="meta-chip">
              <span className="label">Network</span>
              <code>devnet · no wallet connected</code>
            </span>
          )}
        </div>

        {connected && (
          <nav className="hero-nav">
            <Link href="/policy" className="cta-button">
              Open policy editor →
            </Link>
            <Link href="/audit" className="cta-button ghost">
              View audit trail →
            </Link>
          </nav>
        )}
      </section>

      <section className="stats-grid">
        {STATS.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-number">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="landing-section">
        <p className="section-eyebrow">Architecture</p>
        <h2>Three zones. Three keypairs. One signer.</h2>
        <p className="section-prose">
          Privacy in RiskClaw isn&apos;t a UX layer — it&apos;s a key-separation
          guarantee enforced both onchain and offchain. The Observer is allowed
          to read everything but holds no key. The Analyst can ask Arcium
          &quot;is the threshold breached?&quot; but never sees the answer in
          plaintext form. The Guardian is the only address that can sign — and
          only inside the limits that Swig delegation permits.
        </p>

        <div className="zone-grid">
          {ZONES.map((z) => (
            <article key={z.tag} className="zone-card">
              <span className="zone-tag">
                <span className={z.dot} />
                {z.tag}
              </span>
              <div className="zone-name">{z.name}</div>
              <p className="zone-rule">{z.rule}</p>
            </article>
          ))}
        </div>
      </section>

      <blockquote className="pull-quote">
        <p>Sealed at rest.</p>
        <p>Sealed in compute.</p>
        <p>Sealed at execution.</p>
        <p className="punchline">Agents enforce what they cannot see.</p>
      </blockquote>

      <section className="landing-section">
        <p className="section-eyebrow">How it works</p>
        <h2>Encrypted policy → MPC check → bounded rebalance</h2>
        <p className="section-prose">
          On submit, your drawdown threshold is encrypted via Arcium and stored
          as a 64-byte ciphertext on the <code>risk_policy</code> account. The
          Analyst queues a threshold check inside Arcium&apos;s MPC; only the
          public answer leaves the circuit. If breached, the Guardian fires a
          single bounded <code>execute_rebalance</code> via Swig — slippage and
          notional caps enforced by the program, not by trust.
        </p>
      </section>

      <section className="landing-cta">
        <p className="section-eyebrow">Colosseum Frontier · Devnet only</p>
        <div className="cta-row">
          <Link href="/policy" className="cta-button">
            Encrypt a policy →
          </Link>
          <Link href="/audit" className="cta-button ghost">
            See the audit trail →
          </Link>
        </div>
      </section>
    </div>
  );
}
