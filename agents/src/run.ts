import { createAnalyst } from "./analyst";
import { createGuardian } from "./guardian";
import { createObserver } from "./observer";
import { stubClient } from "./onchain-client";

async function main() {
  // TODO Builder A — D5 (2026-05-07): replace stubClient with the real
  // @riskclaw/onchain client once Builder B ships it.
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
      // TODO Builder A — D5: derive a real RebalancePlan from the
      // institutional policy + observed metrics. Stub plan below.
      await guardian.execute({
        positionId: metrics.positionId,
        action: "REDUCE",
        sizeBps: 5000,
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
