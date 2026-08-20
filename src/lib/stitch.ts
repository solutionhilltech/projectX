import { Stitch, StitchToolClient, StitchError, buildFifeSuffix } from "@google/stitch-sdk";

// Stitch's own tool docs for generate_screen_from_text: "This action can take
// a few minutes... DO NOT RETRY. If the tool fails with a timeout... try to get
// the screen every 30 seconds for up to 10 times before giving up."
const SCREEN_POLL_ATTEMPTS = 10;
const SCREEN_POLL_INTERVAL_MS = 30_000;
// Same docs: the tool may answer with text/suggestions instead of a design
// ("If the user accepts one of the suggestions, call generate_screen_from_text
// again with prompt set to the accepted suggestion"). Bounded so a model that
// only ever asks follow-up questions can't loop forever.
const MAX_CONVERSATION_ROUNDS = 3;

/** The subset of Stitch's response we read. Not exported by the SDK's public index. */
interface StitchScreen {
  screenshot?: { downloadUrl?: string };
  width?: string | number;
  height?: string | number;
}
interface OutputComponent {
  design?: { screens?: StitchScreen[] };
  suggestion?: string;
  text?: string;
}
interface GenerateResponse {
  outputComponents?: OutputComponent[];
}

// A workable subset of Stitch's 65-font enum, spanning sans / serif / display.
// Anything outside it (or a hallucinated font name) falls back to INTER —
// an invalid enum value makes the whole create_design_system call fail.
const ALLOWED_FONTS = [
  "INTER", "MANROPE", "PLUS_JAKARTA_SANS", "SPACE_GROTESK", "WORK_SANS", "DM_SANS",
  "SORA", "OUTFIT", "LEXEND", "RUBIK", "KARLA", "EPILOGUE", "GEIST", "SYNE",
  "MONTSERRAT", "RALEWAY", "QUICKSAND", "COMFORTAA", "OSWALD", "BEBAS_NEUE", "ANTON",
  "PLAYFAIR_DISPLAY", "EB_GARAMOND", "LIBRE_CASLON_TEXT", "MERRIWEATHER", "NOTO_SERIF",
] as const;
const FONT_SET = new Set<string>(ALLOWED_FONTS);
const ALLOWED_ROUNDNESS = new Set(["ROUND_TWO", "ROUND_FOUR", "ROUND_EIGHT", "ROUND_TWELVE", "ROUND_FULL"]);

export type StitchFont = (typeof ALLOWED_FONTS)[number];

/** The theme tokens Stitch's design system requires. All five are mandatory server-side. */
export interface StitchTheme {
  colorMode: "LIGHT" | "DARK";
  headlineFont: StitchFont;
  bodyFont: StitchFont;
  roundness: "ROUND_TWO" | "ROUND_FOUR" | "ROUND_EIGHT" | "ROUND_TWELVE" | "ROUND_FULL";
  /** Seed colour in hex, e.g. "#4F46E5". */
  customColor: string;
}

/** Coerces model-authored theme tokens into values Stitch's enums actually accept. */
export function normalizeTheme(theme?: Partial<StitchTheme>): StitchTheme {
  const font = (value?: string): StitchFont => (value && FONT_SET.has(value) ? (value as StitchFont) : "INTER");
  const roundness = theme?.roundness && ALLOWED_ROUNDNESS.has(theme.roundness) ? theme.roundness : "ROUND_TWELVE";
  return {
    colorMode: theme?.colorMode === "DARK" ? "DARK" : "LIGHT",
    headlineFont: font(theme?.headlineFont),
    bodyFont: font(theme?.bodyFont),
    roundness,
    customColor: /^#[0-9a-fA-F]{6}$/.test(theme?.customColor ?? "") ? theme!.customColor! : "#4F46E5",
  };
}

/** Self-check: bad model output must never reach Stitch's enums. */
export function runThemeNormalizerSelfCheck(): boolean {
  const bad = normalizeTheme({ colorMode: "PURPLE" as "LIGHT", headlineFont: "Comic Sans" as StitchFont, roundness: "ROUND_NINE" as "ROUND_TWO", customColor: "blue" });
  const good = normalizeTheme({ colorMode: "DARK", headlineFont: "SORA", bodyFont: "DM_SANS", roundness: "ROUND_FULL", customColor: "#AbC123" });
  return (
    bad.colorMode === "LIGHT" && bad.headlineFont === "INTER" && bad.roundness === "ROUND_TWELVE" &&
    bad.customColor === "#4F46E5" && good.colorMode === "DARK" && good.headlineFont === "SORA" &&
    good.bodyFont === "DM_SANS" && good.roundness === "ROUND_FULL" && good.customColor === "#AbC123"
  );
}

/** Exchanges the persisted OAuth refresh token (from /api/stitch/auth) for a short-lived access token. */
async function getAccessToken(refreshToken: string): Promise<string> {
  const client_id = process.env.STITCH_OAUTH_CLIENT_ID;
  const client_secret = process.env.STITCH_OAUTH_CLIENT_SECRET;
  if (!client_id || !client_secret) {
    throw new Error("STITCH_OAUTH_CLIENT_ID or STITCH_OAUTH_CLIENT_SECRET environment variables are not configured.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id,
      client_secret,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!res.ok) {
    throw new Error(`Stitch OAuth token refresh failed: ${res.status} - ${await res.text()}`);
  }

  return (await res.json()).access_token;
}

/**
 * Stitch returns supporting imagery (square illustration/style tiles, a
 * landscape banner) in the same design.screens array as the actual page
 * render. The page is strongly portrait — the extras are square or landscape.
 * Falls back to everything if nothing looks page-shaped, so a layout we
 * haven't seen can never yield zero images.
 * ponytail: aspect-ratio heuristic, swap for a real type field if Stitch adds one.
 */
function pageLikeScreens(screens: StitchScreen[]): StitchScreen[] {
  const pages = screens.filter((s) => {
    const w = Number(s.width) || 0;
    const h = Number(s.height) || 0;
    return w > 0 && h / w >= 1.5;
  });
  return pages.length > 0 ? pages : screens;
}

/** Self-check: page renders survive the filter, supporting imagery does not. */
export function runScreenFilterSelfCheck(): boolean {
  const page = { width: "780", height: "8846" };
  const tile = { width: "1024", height: "1024" };
  const banner = { width: "1264", height: "848" };
  const mixed = pageLikeScreens([tile, banner, page, tile]);
  const onlyTiles = pageLikeScreens([tile, banner]);
  return mixed.length === 1 && mixed[0] === page && onlyTiles.length === 2;
}

function screensToImageUrls(screens: StitchScreen[]): string[] {
  const imageUrls: string[] = [];
  for (const screen of screens) {
    const url = screen.screenshot?.downloadUrl;
    if (!url) continue;
    // Bare downloadUrl serves a ~20KB thumbnail; the FIFE size suffix asks for
    // the full-resolution render. Do NOT multiply by 2: for tall full-page
    // mobile designs (e.g. 780x8636) that exceeds the image server's pixel
    // budget, which 400s with an HTML error page instead of an image — and
    // WhatsApp then fails to download it (Meta error 131053).
    const width = Number(screen.width) || undefined;
    const height = Number(screen.height) || undefined;
    imageUrls.push(url + buildFifeSuffix({ width, height }));
  }
  return imageUrls;
}

/** Connects to Stitch MCP, creates a project, generates the redesign, and returns images. */
export async function generateDesign(params: {
  businessName: string;
  prompt: string;
  theme?: Partial<StitchTheme>;
  refreshToken?: string;
}): Promise<{ imageUrls: string[]; projectId: string }> {
  const baseUrl = process.env.STITCH_MCP_URL;
  const apiKey = process.env.STITCH_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("STITCH_MCP_URL or STITCH_API_KEY environment variables are not configured.");
  }

  // Google's SDK handles the pieces we previously hand-rolled: auth header
  // choice, the SSE-capable transport, repairing the broken $defs Stitch sends
  // in its tool schemas, and turning isError results into real messages.
  const client = new StitchToolClient({
    baseUrl,
    // The SDK's own default. Generation "can take a few minutes", so a shorter
    // timeout just forces the polling fallback for runs that would have landed.
    timeout: 300_000,
    ...(params.refreshToken
      ? {
          accessToken: await getAccessToken(params.refreshToken),
          // Required alongside OAuth per the SDK docs (sent as X-Goog-User-Project).
          projectId: process.env.GOOGLE_CLOUD_PROJECT,
        }
      : { apiKey }),
  });

  try {
    const stitch = new Stitch(client);

    console.log(`Creating project in Stitch for: ${params.businessName}`);
    const created = await stitch.createProject(`${params.businessName} Redesign`);
    const projectId = created.projectId || String(created.data?.name || "").split("/").pop() || "";
    if (!projectId) {
      throw new Error(`Failed to retrieve project ID from create_project response: ${JSON.stringify(created.data)}`);
    }
    const project = stitch.project(projectId);

    // The web UI never generates into a bare project — it builds "the visual
    // foundation" (a design system) first, and the generate_screen_from_text
    // schema says designSystem "should always be configured". Best-effort: if
    // this fails, fall back to Stitch's default design system.
    let designSystem: string | undefined;
    try {
      // theme is required, and so are all five fields below. Note the SDK's
      // DesignSystemInput type also allows styleGuidelines/designTokens, but the
      // server's schema rejects them — free-form direction goes in theme.designMd.
      const designSystemInput = {
        displayName: `${params.businessName} Theme`,
        theme: {
          ...normalizeTheme(params.theme),
          designMd: params.prompt,
        },
      };

      // The installed SDK's font enum is generated from an older manifest than
      // the live API accepts, so its literal type rejects fonts the server
      // takes. Cast at this boundary only; normalizeTheme is the real guard.
      type DesignSystemArg = Parameters<typeof project.createDesignSystem>[0];

      const ds = await project.createDesignSystem(designSystemInput as DesignSystemArg);
      designSystem = ds.data?.name || (ds.assetId ? `assets/${ds.assetId}` : undefined);
      // Documented follow-up: "Call update_design_system immediately after this
      // tool to apply the design system to the project."
      await ds.update(designSystemInput as DesignSystemArg);
      console.log(`Created design system for the project: ${designSystem}`);
    } catch (err) {
      console.warn("Could not create a design system; falling back to Stitch's default.", err);
    }

    console.log(`Stitch project created successfully. Project ID: ${projectId}. Generating MOBILE screen...`);

    let screens: StitchScreen[] = [];
    let prompt = params.prompt;

    // Stitch may reply conversationally (a question plus a suggested next
    // prompt) rather than rendering. Accepting the suggestion is the documented
    // way to move it along; giving up here is what made every run look failed.
    for (let round = 1; round <= MAX_CONVERSATION_ROUNDS && screens.length === 0; round++) {
      let reply: GenerateResponse | undefined;
      try {
        reply = await client.callTool<GenerateResponse>("generate_screen_from_text", {
          projectId,
          prompt,
          deviceType: "MOBILE",
          ...(designSystem ? { designSystem } : {}),
        });
      } catch (err) {
        // StitchError carries a typed code (AUTH_FAILED, RATE_LIMITED, ...) that
        // says whether this is our credentials, a quota, or Stitch's backend.
        const code = err instanceof StitchError ? ` [${err.code}${err.recoverable ? ", recoverable" : ""}]` : "";
        console.warn(`generate_screen_from_text failed${code}; generation may still be running. Falling through to polling.`, err);
        break;
      }

      const components = reply?.outputComponents ?? [];
      screens = components.find((c) => c.design?.screens?.length)?.design?.screens ?? [];
      if (screens.length > 0) break;

      const text = components.map((c) => c.text).filter(Boolean).join(" ").trim();
      if (text) console.log(`Stitch replied with text instead of a design: ${text.slice(0, 300)}`);

      const suggestion = components.find((c) => c.suggestion)?.suggestion;
      if (!suggestion) break;

      console.log(`Stitch offered a suggestion (round ${round}/${MAX_CONVERSATION_ROUNDS}); accepting it: "${suggestion.slice(0, 120)}"`);
      prompt = suggestion;
    }

    // A response with no design at all means generation is still running
    // server-side — not a failure. Poll rather than re-generate.
    for (let attempt = 1; screens.length === 0 && attempt <= SCREEN_POLL_ATTEMPTS; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, SCREEN_POLL_INTERVAL_MS));
      console.log(`Waiting on Stitch generation — polling screens (${attempt}/${SCREEN_POLL_ATTEMPTS})...`);
      screens = (await project.screens()).map((s) => s.data as StitchScreen);
    }

    const imageUrls = screensToImageUrls(pageLikeScreens(screens));
    if (imageUrls.length === 0) {
      throw new Error(
        `Stitch produced no screens for project ${projectId} after polling for ${(SCREEN_POLL_ATTEMPTS * SCREEN_POLL_INTERVAL_MS) / 1000}s.`
      );
    }

    return { imageUrls, projectId };
  } finally {
    try {
      await client.close();
    } catch (e) {
      console.warn("Client close warning:", e);
    }
  }
}
