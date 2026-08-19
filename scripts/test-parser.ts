import { runPromptParserSelfCheck } from "../src/lib/redesign-prompt";

function test() {
  console.log("Running self-check test for redesign-prompt JSON parser...");
  const ok = runPromptParserSelfCheck();
  if (ok) {
    console.log("SUCCESS: JSON parser self-check passed!");
    process.exit(0);
  } else {
    console.error("FAIL: JSON parser self-check failed!");
    process.exit(1);
  }
}

test();
