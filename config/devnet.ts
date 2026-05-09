// Shared devnet configuration. Both Builder A's app + agents and Builder B's
// programs/scripts read from here so program IDs and the dev multisig stay
// in one place. Treat values as the live state — when a deploy lands,
// update.
//
// Addresses are exported as base58 strings (zero deps); each consumer wraps
// them in PublicKey on its own side. Keeps this file importable from any
// workspace without dragging @solana/web3.js into the resolution path.

export const RPC_ENDPOINT = "https://api.devnet.solana.com";
export const HELIUS_DEVNET_WS = "wss://devnet.helius-rpc.com";

// One Orca whirlpool, hardcoded for v1 (BUILD_PLAN risk #4).
// Devnet SOL/USDC whirlpool. Replace if Orca rotates the pool address.
export const ORCA_WHIRLPOOL_DEVNET = "3KBZiL2g8C7tiJ32hTv5v3KM7aK9htpqTw4cTXz1HvPp";

// Squads V4 program ID (mainnet + devnet — same address).
// https://github.com/Squads-Protocol/v4
export const SQUADS_V4_PROGRAM_ID = "SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf";

// Populated by scripts/create-multisig.ts — the dev multisig that owns the
// RiskClaw policy. 1-of-1 for the demo (operator is also the only signer).
// `null` until create-multisig.ts runs and writes back into this file.
export const DEV_MULTISIG: string | null = null;

// Builder B writes program IDs here once the Anchor programs are deployed.
// Until then, both are `null` and the app/agents stay on the local stub.
export const RISK_POLICY_PROGRAM_ID: string | null = "FNThNjwxtdVSttM1Q9R81pKbiSF7jCzt8vE22A4PHrzN";
export const SWIG_DELEGATION_PROGRAM_ID: string | null = "9ECtiz1EnfKnVDYFKn4GofXGeoCZHupqN2GPkcgL9zBo";

export const DEVNET_AGENTS: { [zone: string]: { mint: string; pubkey: string; name: string } } = {
  "read": {
    "mint": "AERmaK7CD7HGp8zFHP3PEGtfEC6QWZUHYh6Xg8YHwLQU",
    "pubkey": "EsRmSkrcjfoqEzgh4Wzbo56KqymTZ2NMMy1kxJtHHFRR",
    "name": "Observer"
  },
  "compute": {
    "mint": "Hq5VqNHUNtENWTNTk3ZqJz6jdJExrzw5cUCayAhVUjdo",
    "pubkey": "6GJuVdSUUenAC4B2px9VaCC63EjMhTE4K26zLHZQPo22",
    "name": "Analyst"
  },
  "execute": {
    "mint": "ERxDBEUU6heys5PrA93tGZwjWucvhY3jJdyQpsFE9YzH",
    "pubkey": "Ajeq8tVnK9CDJGagRnV2LWghduSYaeFpevpu7VoMBHpW",
    "name": "Guardian"
  }
};
