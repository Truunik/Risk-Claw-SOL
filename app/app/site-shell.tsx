"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Console" },
  { href: "/policy", label: "Policy" },
  { href: "/audit", label: "Audit" },
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-shell">
      <TopBar />
      <main className="site-body">{children}</main>
      <SiteFooter />
    </div>
  );
}

function TopBar() {
  const pathname = usePathname();
  return (
    <header className="topbar">
      <Link href="/" className="brand" aria-label="RiskClaw home">
        <Image
          src="/riskclaw-logo.png"
          alt=""
          width={32}
          height={32}
          className="brand-shield"
          priority
        />
        <span className="brand-mark">RiskClaw</span>
      </Link>

      <nav className="tabs">
        {NAV.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`nav-link${active ? " active" : ""}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="topbar-actions">
        <a
          href="https://github.com/Truunik/Risk-Claw-SOL"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          className="topbar-link"
        >
          <GitHubIcon />
        </a>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="created-by">
        RiskClaw — Colosseum Frontier · Devnet only ·{" "}
        <a
          href="https://github.com/Truunik/Risk-Claw-SOL"
          target="_blank"
          rel="noopener noreferrer"
        >
          source
        </a>
      </div>
      <div className="footer-links">
        <a
          href="https://github.com/Truunik/Risk-Claw-SOL"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          className="topbar-link"
        >
          <GitHubIcon />
        </a>
      </div>
    </footer>
  );
}

function GitHubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
