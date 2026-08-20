import { runSiteScraperSelfCheck } from "../src/lib/site-scraper";

function test() {
  console.log("Running self-check test for website scraping / HTML extraction...");
  const ok = runSiteScraperSelfCheck();
  if (ok) {
    console.log("SUCCESS: site scraper self-check passed!");
    process.exit(0);
  } else {
    console.error("FAIL: site scraper self-check failed!");
    process.exit(1);
  }
}

test();
