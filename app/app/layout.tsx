import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppWalletProvider } from "./wallet-provider";
import { SiteShell } from "./site-shell";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "RiskClaw — Audit-grade Autonomous Policy Enforcement",
  description:
    "Agents enforce what they cannot see. Solana onchain risk policy with cryptographic privacy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistMono.variable} h-full`}>
      <body>
        <AppWalletProvider>
          <SiteShell>{children}</SiteShell>
        </AppWalletProvider>
      </body>
    </html>
  );
}
