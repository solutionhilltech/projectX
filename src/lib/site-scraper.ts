/**
 * Pulls the readable content off a business's current website so the prompt
 * writer can describe their actual services and products.
 *
 * Deliberately a plain fetch, not a headless browser: we only need text, and
 * running Chromium for it cost far more memory than it was worth. The trade-off
 * is that a JS-rendered SPA returns an near-empty shell and social links (a
 * couple of these businesses list Instagram as their "website") return a login
 * wall — hence `isUseful`, so callers can fall back to metadata instead.
 */

// Some hosts 403 anything that doesn't look like a browser.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 15_000;
// Jina renders the page before returning, so it needs longer than a raw fetch.
const JINA_TIMEOUT_MS = 45_000;
/** Enough for an LLM to understand the business; keeps the prompt cheap. */
const MAX_TEXT_CHARS = 4000;

export interface ScrapedSite {
  title: string;
  description: string;
  headings: string[];
  text: string;
  /** Hex colours seen in the markup, most frequent first — brand-colour hints. */
  colors: string[];
  /** False when the fetch failed or the page yielded almost no readable content. */
  isUseful: boolean;
}

const EMPTY: ScrapedSite = { title: "", description: "", headings: [], text: "", colors: [], isUseful: false };

function decodeEntities(value: string): string {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };
  return value.replace(/&(#?\w+);/g, (match, code: string) => named[code] ?? match);
}

function collapse(value: string): string {
  return decodeEntities(value).replace(/\s+/g, " ").trim();
}

/** Headings routinely wrap their text in spans/strong/img — keep only the words. */
function stripTags(value: string): string {
  return collapse(value.replace(/<[^>]+>/g, " "));
}

/** Strips tags and non-content elements, leaving readable page text. */
function htmlToText(html: string): string {
  const withoutNoise = html
    .replace(/<(script|style|noscript|svg|iframe|template)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  return collapse(withoutNoise.replace(/<[^>]+>/g, " "));
}

function matchAll(html: string, pattern: RegExp): string[] {
  // String.matchAll throws on a non-global pattern; several callers below only
  // want the first match and pass one without /g.
  const global = pattern.global ? pattern : new RegExp(pattern.source, `${pattern.flags}g`);
  return [...html.matchAll(global)].map((m) => collapse(m[1])).filter(Boolean);
}

function extractDescription(html: string): string {
  return (
    matchAll(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)[0] ??
    matchAll(html, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)[0] ??
    ""
  );
}

/** Most-used hex colours, minus the black/white/grey that every page contains. */
function extractColors(html: string): string[] {
  const counts = new Map<string, number>();
  for (const [, hex] of html.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
    const value = hex.toLowerCase();
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
    // Skip near-greyscale: those are text/border colours, never the brand.
    if (Math.max(r, g, b) - Math.min(r, g, b) < 24) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([hex]) => `#${hex}`);
}

/** Raw HTML, used for colour extraction and as the fallback text source. */
async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`Site scrape got HTTP ${res.status} for ${url}`);
      return null;
    }
    if (!(res.headers.get("content-type") ?? "").includes("html")) return null;
    return await res.text();
  } catch (err) {
    console.warn(`Site scrape failed for ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Jina Reader renders the page (JavaScript included) and returns markdown, so
 * it reads SPAs and social profiles that a plain fetch only sees as a shell.
 */
async function fetchViaJina(url: string): Promise<{ title: string; headings: string[]; text: string } | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Authorization: `Bearer ${process.env.JINA_API_KEY}`, "X-Return-Format": "markdown" },
      signal: AbortSignal.timeout(JINA_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`Jina Reader returned HTTP ${res.status} for ${url}`);
      return null;
    }
    const body = await res.text();

    // Response opens with "Title: ...\nURL Source: ...\nMarkdown Content:\n<body>".
    const title = collapse(body.match(/^Title:\s*(.+)$/m)?.[1] ?? "");
    const content = body.split(/^Markdown Content:\s*$/m).slice(1).join("\n") || body;
    const headings = [
      ...new Set([...content.matchAll(/^#{1,3}\s+(.+)$/gm)].map((m) => collapse(m[1].replace(/[*_`[\]]/g, "")))),
    ]
      .filter(Boolean)
      .slice(0, 25);

    // Strip markdown links/images down to their text so the prompt isn't URLs.
    const text = collapse(
      content
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/[#*_>`|-]{2,}/g, " ")
    ).slice(0, MAX_TEXT_CHARS);

    return { title, headings, text };
  } catch (err) {
    console.warn(`Jina Reader failed for ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export async function scrapeSite(url: string): Promise<ScrapedSite> {
  // Jina reads the rendered page; the raw HTML is still worth fetching in
  // parallel because brand colours live in CSS, which markdown throws away.
  const [jina, html] = await Promise.all([
    process.env.JINA_API_KEY ? fetchViaJina(url) : Promise.resolve(null),
    fetchHtml(url),
  ]);

  if (jina && (jina.text.length > 200 || jina.headings.length > 2)) {
    return {
      title: jina.title,
      description: html ? extractDescription(html) : "",
      headings: jina.headings,
      text: jina.text,
      colors: html ? extractColors(html) : [],
      isUseful: true,
    };
  }

  if (!html) return EMPTY;

  const title = matchAll(html, /<title[^>]*>([\s\S]*?)<\/title>/i)[0] ?? "";
  const description = extractDescription(html);
  const headings = [
    ...new Set(matchAll(html, /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi).map(stripTags).filter(Boolean)),
  ].slice(0, 25);
  const text = htmlToText(html).slice(0, MAX_TEXT_CHARS);

  return {
    title,
    description,
    headings,
    text,
    colors: extractColors(html),
    // A login wall or SPA shell yields a title and nothing else worth reading.
    isUseful: text.length > 200 || headings.length > 2,
  };
}

/** Formats scraped content for an LLM prompt; empty string when there's nothing useful. */
export function describeSite(site: ScrapedSite): string {
  if (!site.isUseful) return "";
  const parts = [
    site.title && `Page title: ${site.title}`,
    site.description && `Meta description: ${site.description}`,
    site.headings.length > 0 && `Headings: ${site.headings.join(" | ")}`,
    site.colors.length > 0 && `Hex colours used on the site: ${site.colors.join(", ")}`,
    site.text && `Page text: ${site.text}`,
  ];
  return parts.filter(Boolean).join("\n");
}

/** Self-check for the HTML parsing, which is all regex and easy to break. */
export function runSiteScraperSelfCheck(): boolean {
  const html = `
    <html><head><title>Bean &amp; Brew</title>
    <meta name="description" content="Specialty coffee in Solan">
    <style>.a{color:#1a1a1a}</style></head>
    <body><h1><span class="x">Fresh Roasted Daily</span></h1><h2>Our Menu</h2>
    <h3><img alt="decorative" src="a.png"></h3>
    <script>var x = "ignore me";</script>
    <p style="color:#c2410c">Pour over, espresso and cold brew.</p></body></html>`;

  const site = {
    title: matchAll(html, /<title[^>]*>([\s\S]*?)<\/title>/i)[0] ?? "",
    description: matchAll(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)[0] ?? "",
    headings: [
      ...new Set(matchAll(html, /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi).map(stripTags).filter(Boolean)),
    ],
    text: htmlToText(html),
    colors: extractColors(html),
  };

  return (
    site.title === "Bean & Brew" &&                    // entity decoded
    site.description === "Specialty coffee in Solan" &&
    site.headings.length === 2 &&                      // image-only heading dropped
    site.headings[0] === "Fresh Roasted Daily" &&      // nested markup stripped
    !site.text.includes("ignore me") &&                // script contents dropped
    site.text.includes("Pour over") &&
    site.colors.includes("#c2410c") &&                 // brand colour kept
    !site.colors.includes("#1a1a1a")                   // near-greyscale dropped
  );
}
