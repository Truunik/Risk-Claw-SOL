import { createAnalyst } from "./analyst";
import { createGuardian } from "./guardian";
import { createObserver } from "./observer";
import { stubClient } from "./onchain-client";

async function main() {
  // Builder A: @riskclaw/onchain RealClient + bundled IDLs landed in PR #4
  // + PR #5. To swap, replace `stubClient` with `createRealClient({
  // connection, wallet, cluster: "devnet", riskPolicyIdl, swigDelegationIdl
  // })` — full step-by-step in .planning/builder-a-swap-guide.md. The swap
  // gates T-33 (paired devnet test).
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
