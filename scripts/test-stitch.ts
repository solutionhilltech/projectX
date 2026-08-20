// Explicit .ts extension + plain `node` (not tsx): stitch.ts pulls in the
// ESM-only @google/stitch-sdk, which tsx's CJS resolver can't load.
//   node --experimental-strip-types scripts/test-stitch.ts
import { runThemeNormalizerSelfCheck, runScreenFilterSelfCheck } from "../src/lib/stitch.ts";

function test() {
  console.log("Running self-checks for Stitch theme normalisation and screen filtering...");

  const checks: [string, boolean][] = [
    ["theme normaliser coerces bad model output to valid Stitch enums", runThemeNormalizerSelfCheck()],
    ["screen filter keeps page renders and drops supporting imagery", runScreenFilterSelfCheck()],
  ];

  let ok = true;
  for (const [name, passed] of checks) {
    console.log(`  ${passed ? "PASS" : "FAIL"}  ${name}`);
    if (!passed) ok = false;
  }

  if (ok) {
    console.log("SUCCESS: Stitch self-checks passed!");
    process.exit(0);
  } else {
    console.error("FAIL: Stitch self-checks failed!");
    process.exit(1);
  }
}

test();
