import type { PositionMetrics } from "./types";

// READ ZONE.
// No signing key. No policy access. Only RPC reads and metric emission.
// If you import a Keypair into this file, you have broken zone separation.
export type Observer = {
  start(): Promise<void>;
  stop(): Promise<void>;
  onMetrics(handler: (m: PositionMetrics) => void): void;
};

export function createObserver(opts: {
  heliusApiKey: string;
  positionIds: string[];
}): Observer {
  let handler: ((m: PositionMetrics) => void) | null = null;

  return {
    async start() {
      if (!opts.heliusApiKey) {
        throw new Error("HELIUS_API_KEY required for Observer");
      }
      // TODO Builder A — D3 (2026-05-05):
      // 1. Open Helius LaserStream gRPC subscription for opts.positionIds.
      // 2. For each pool/position state update, parse into PositionMetrics.
      // 3. Emit via handler(metrics).
      // Reference: https://docs.helius.dev/laserstream
      console.log(`[observer] watching ${opts.positionIds.length} position(s)`);
    },
    async stop() {
      // TODO: close LaserStream subscription
    },
    onMetrics(h) {
      handler = h;
    },
  };
}
