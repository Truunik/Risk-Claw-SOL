import { createAnalyst } from "./analyst";
import { createGuardian } from "./guardian";
import { createObserver } from "./observer";
import { stubClient } from "./onchain-client";

async function main() {
  // TODO Builder A: swap to the real @riskclaw/onchain client when Builder B
  // ships Pkg-15..22 (RealClient implementation).
  const onchain = stubClient;

  const heliusApiKey = process.env.HELIUS_API_KEY;
  if (!heliusApiKey) {
    throw new Error("HELIUS_API_KEY missing — see .env.example");
  }

  const observer = createObserver({
    heliusApiKey,
    positionIds: process.env.POSITION_IDS?.split(",").filter(Boolean) ?? [],
  });
  const analyst = createAnalyst({ onchain });
  const guardian = createGuardian({ onchain });

  observer.onMetrics(async (metrics) => {
    const result = await analyst.evaluate(metrics);
    if (result.breached) {
      // v1 ships only EXIT (PRD §2.2 + FR-9). REDUCE/HEDGE are typed but
      // not yet supported by swig_delegation::execute_rebalance.
      await guardian.execute({
        positionId: metrics.positionId,
        action: "EXIT",
        sizeBps: 10_000,
      });
    }
  });

  await observer.start();
  console.log("[riskclaw-sol] agents online");
}

main().catch((err) => {
  console.error("[riskclaw-sol] fatal:", err);
  process.exit(1);
});
