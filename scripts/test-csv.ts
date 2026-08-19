import { runCsvSelfCheck } from "../src/lib/csv";

function test() {
  console.log("Running self-check test for CSV export escaping...");
  const ok = runCsvSelfCheck();
  if (ok) {
    console.log("SUCCESS: CSV self-check passed!");
    process.exit(0);
  } else {
    console.error("FAIL: CSV self-check failed!");
    process.exit(1);
  }
}

test();
