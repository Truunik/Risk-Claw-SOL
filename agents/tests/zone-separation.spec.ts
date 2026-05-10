// T-30b (v1) — Agent zone-separation invariant.
//
// PRD §9 G1: the privacy claim "Analyst can never sign / Observer can never
// sign" is enforced architecturally in v1 by file-level zone separation. The
// Anchor-side variant (Analyst-only `Signer` constraint on
// `risk_policy::queue_threshold_check`) is deferred to C-14 with the rest of
// the Arcium runtime path (see T-34 §9.5 caveat).
//
// This test fails CI if anyone — human or AI — accidentally introduces a
// signing primitive into the READ or COMPUTE zone source files. That includes
// importing `Keypair`, calling `signTransaction` / `sendTransaction`, or
// pulling in a wallet adapter. Only `guardian.ts` (EXECUTE zone) may sign.
//
// The match is intentionally syntactic + conservative: we want the test to be
// noisy on the day someone tries to break the invariant, even if the import
// would be technically benign.

import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SRC = resolve(import.meta.dir, "..", "src");

type ZoneFile = {
  zone: "read" | "compute" | "execute";
  path: string;
  expectedHeader: string;
};

const ZONE_FILES: ZoneFile[] = [
  { zone: "read",    path: resolve(SRC, "observer.ts"), expectedHeader: "// READ ZONE." },
  { zone: "compute", path: resolve(SRC, "analyst.ts"),  expectedHeader: "// COMPUTE ZONE." },
  { zone: "execute", path: resolve(SRC, "guardian.ts"), expectedHeader: "// EXECUTE ZONE." },
];

// Anything that implies "this file can sign a transaction." If a future
// refactor needs one of these in observer/analyst, that refactor MUST move the
// call into guardian.ts (or @riskclaw/onchain) — not relax this test.
const SIGNING_PRIMITIVES: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bKeypair\b/,            reason: "imports/uses Keypair (signing key material)" },
  { pattern: /\bsignTransaction\b/,    reason: "calls signTransaction" },
  { pattern: /\bsendTransaction\b/,    reason: "calls sendTransaction (wallet-side broadcast)" },
  { pattern: /\bsendAndConfirmTransaction\b/, reason: "calls sendAndConfirmTransaction" },
  { pattern: /\bsendRawTransaction\b/, reason: "calls sendRawTransaction" },
  { pattern: /from ["']@solana\/wallet-adapter/, reason: "imports a wallet adapter" },
  { pattern: /\bsecretKey\b/,          reason: "references secretKey" },
];

function readSource(p: string): string {
  return readFileSync(p, "utf8");
}

// Strip line comments + block comments so the zone files can self-document
// the rule ("// If you import a Keypair into this file...") without tripping
// the scanner.
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

test("zone headers are pinned in the source files (G1 documentation invariant)", () => {
  for (const f of ZONE_FILES) {
    const src = readSource(f.path);
    expect(src).toContain(f.expectedHeader);
  }
});

test("READ ZONE (observer.ts) holds no signing primitives", () => {
  const code = stripComments(readSource(ZONE_FILES[0].path));
  for (const { pattern, reason } of SIGNING_PRIMITIVES) {
    if (pattern.test(code)) {
      throw new Error(`observer.ts violates READ ZONE: ${reason}`);
    }
    expect(pattern.test(code)).toBe(false);
  }
});

test("COMPUTE ZONE (analyst.ts) holds no signing primitives", () => {
  const code = stripComments(readSource(ZONE_FILES[1].path));
  for (const { pattern, reason } of SIGNING_PRIMITIVES) {
    if (pattern.test(code)) {
      throw new Error(`analyst.ts violates COMPUTE ZONE: ${reason}`);
    }
    expect(pattern.test(code)).toBe(false);
  }
});

test("COMPUTE ZONE (analyst.ts) does not log score values (FR-7)", () => {
  // PRD FR-7: plaintext score must NEVER be logged or persisted past the
  // function call. The Analyst is the only TS-side consumer of `score`.
  const src = readSource(ZONE_FILES[1].path);
  // Cheap syntactic check: any console.* line that mentions `score` is a leak.
  const lines = src.split("\n");
  for (const line of lines) {
    if (/console\.(log|info|warn|error|debug)/.test(line)) {
      expect(/\bscore\b/.test(line)).toBe(false);
    }
  }
});

test("READ ZONE (observer.ts) does not import the OnchainClient surface", () => {
  // Observer's job is metric emission only — it must not be able to call
  // setEncryptedPolicy / executePrivateRebalance even by mistake.
  const src = readSource(ZONE_FILES[0].path);
  expect(/\bonchain-client\b|@riskclaw\/onchain/.test(src)).toBe(false);
});

test("EXECUTE ZONE (guardian.ts) is the only zone that may sign", () => {
  // Sanity: guardian.ts is allowed to do whatever it needs. We only assert
  // that it carries the correct zone header so the convention is visible to
  // a code reviewer.
  const src = readSource(ZONE_FILES[2].path);
  expect(src).toContain("// EXECUTE ZONE.");
});
