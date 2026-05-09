import type { PositionMetrics } from "./types";

// READ ZONE.
// No signing key. No policy access. Only RPC reads and metric emission.
// If you import a Keypair into this file, you have broken zone separation.
export type Observer = {
  start(): Promise<void>;
  stop(): Promise<void>;
  onMetrics(handler: (m: PositionMetrics) => void): void;
};

type ObserverOpts = {
  heliusApiKey: string;
  positionIds: string[];
  // Optional override for tests. Defaults to Helius devnet WS.
  wsEndpoint?: string;
  // Tick rate for synthetic metric emission (ms). Real pool-state parsing
  // lands in v2 — for v1 the demo runs against scripted drawdown.
  tickMs?: number;
};

// Helius WS subscription to one or more accounts. Each pong from the WS
// triggers a synthetic PositionMetrics emit so the agent loop has something
// to evaluate against. Real Orca whirlpool layout parsing is a v2 task —
// captured in observer.ts but not on the v1 critical path.
export function createObserver(opts: ObserverOpts): Observer {
  const tickMs = opts.tickMs ?? 5_000;
  const wsBase =
    opts.wsEndpoint ?? "wss://devnet.helius-rpc.com";
  const wsUrl = `${wsBase}/?api-key=${opts.heliusApiKey}`;

  let handler: ((m: PositionMetrics) => void) | null = null;
  let ws: WebSocket | null = null;
  let interval: ReturnType<typeof setInterval> | null = null;
  let started = false;

  // Drift curve for v1 demo: drawdown grows linearly from 0 toward 4000bps
  // over ~60 ticks, then loops. Crosses common policy thresholds in the
  // first minute so the demo fires reliably.
  let tick = 0;
  const driftCurve = (t: number) => {
    const phase = t % 60;
    return Math.min(4_000, Math.floor((phase / 60) * 4_000));
  };

  return {
    async start() {
      if (started) return;
      if (!opts.heliusApiKey) {
        throw new Error("HELIUS_API_KEY required for Observer");
      }
      if (opts.positionIds.length === 0) {
        throw new Error("POSITION_IDS empty — pass at least one Solana account");
      }
      started = true;

      ws = new WebSocket(wsUrl);

      ws.addEventListener("open", () => {
        console.log(`[observer] ws open (${opts.positionIds.length} positions)`);
        // Subscribe to each position account. Helius forwards account
        // changes verbatim; for v1 we only use the connection liveness
        // signal — actual pool deserialization is v2.
        opts.positionIds.forEach((id, i) => {
          const sub = {
            jsonrpc: "2.0",
            id: i + 1,
            method: "accountSubscribe",
            params: [id, { encoding: "base64", commitment: "confirmed" }],
          };
          ws?.send(JSON.stringify(sub));
        });
      });

      ws.addEventListener("error", (event) => {
        // Don't take down the agent loop — Helius reconnects on close.
        console.error("[observer] ws error", event);
      });

      ws.addEventListener("close", () => {
        console.warn("[observer] ws closed");
      });

      // Synthetic metric emit independent of WS message rate. Keeps the demo
      // deterministic and prevents the analyst loop from idling when the
      // pool is quiet on devnet.
      interval = setInterval(() => {
        if (!handler) return;
        tick += 1;
        const drawdownBps = driftCurve(tick);
        const positionId = opts.positionIds[0];
        if (!positionId) return;
        const metrics: PositionMetrics = {
          positionId,
          notionalUSD: 2_000_000,
          drawdownBps,
          liquidityShareBps: 100,
          observedAtUnixMs: Date.now(),
        };
        handler(metrics);
      }, tickMs);
    },
    async stop() {
      if (interval) clearInterval(interval);
      if (ws) ws.close();
      ws = null;
      interval = null;
      started = false;
    },
    onMetrics(h) {
      handler = h;
    },
  };
}
