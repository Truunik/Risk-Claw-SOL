import type { PublicKey } from "@solana/web3.js";

export type TxSig = string;
export type MintAddress = PublicKey;

export type DelegationPolicy = {
  maxNotionalUSD: number;
  allowedInstruments: string[];
  maxSlippageBps: number;
  expiresAtUnix: number;
};

export type RebalancePlan = {
  positionId: string;
  action: "REDUCE" | "EXIT" | "HEDGE";
  sizeBps: number;
};

export type AgentConfig = {
  zone: "read" | "compute" | "execute";
  name: string;
  publicKey: PublicKey;
};

export type ThresholdCheckResult = {
  breached: boolean;
  score: number;
};

export type PositionMetrics = {
  positionId: string;
  notionalUSD: number;
  drawdownBps: number;
  liquidityShareBps: number;
  observedAtUnixMs: number;
};
