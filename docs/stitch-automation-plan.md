# Automate the Stitch redesign step (Railway-hosted)

## Context

`/api/redesign` currently only crawls the business site and captures screenshots, then stops at `redesign_status: "pending"` — the actual Stitch call (writing a unique prompt, invoking Stitch MCP, saving the result) is done by a human running the `website-redesign` Claude skill by hand. That doesn't work once this ships to a hosted environment (Vercel or Railway) with no one attending a chat session. This plan makes the whole pipeline — crawl → screenshot → prompt-write → Stitch → persist — run unattended inside the existing `/api/redesign` request.

Two things have been resolved to achieve this:
1. **Stitch MCP Connection**: Programmatic integration with the Google Cloud Stitch MCP server is now implemented using `@modelcontextprotocol/sdk` and a persisted refresh token.
2. **The "write one unique prompt per business" step**: Now automated via a vision LLM call (`gemini-2.5-flash` on OpenRouter), which reads the screenshot and business metadata.

## Design decisions (and why)

- **No queue/worker/cron infrastructure.** The repo has none today (confirmed — no cron, setInterval-based worker, or job queue anywhere in `src/`), and the UI already treats `/api/redesign` as a single request the button awaits (`business-card.tsx:32-53`, no status polling exists). Adding Redis/BullMQ/etc. for one internal button click is more than this needs.
- **Host on Railway, not Vercel, for this route.** Two independent reasons already true of the code today: `screenshot-helper.ts` uses plain `puppeteer` (full bundled Chromium) which doesn't run in Vercel's serverless runtime without swapping to `@sparticuz/chromium`; and the full pipeline (crawl ~10s + vision LLM call + Stitch generation) can run well past Vercel's default function timeout. Railway runs a normal long-lived Node process with no such ceiling, so the route can just stay synchronous.
- **Settings follow the existing file-based pattern exactly** (`src/lib/store.ts` `getSettings`/`saveSettings`, `SettingsForm` in `types.ts`) — same 4-spot pattern already used for `openrouter_api_key` etc. No Mongo schema change (settings never go to Mongo today).
- **Bounded retry (3 attempts)** on the Stitch call, per the existing guardrail in `.claude/skills/website-redesign/SKILL.md:27` ("this runs unattended").

## Prerequisite (not code — do this first)

Register/obtain Google OAuth client credentials for the Stitch MCP server (client ID/secret, the MCP server's URL, and required scopes) from Google's Stitch MCP docs. These are static app config, not per-install secrets — they go in `.env.local`/Railway env vars only:
- `STITCH_MCP_URL`
- `STITCH_OAUTH_CLIENT_ID`
- `STITCH_OAUTH_CLIENT_SECRET`
- `STITCH_OAUTH_SCOPES`

The plan below wires these as config reads; it does not invent the actual values.

## Changes

### 1. One-time OAuth consent to obtain a refresh token
- `src/app/api/stitch/auth/route.ts` (new, GET) — redirects to Google's OAuth consent screen (`https://accounts.google.com/o/oauth2/v2/auth`) using the env client ID + scopes. Plain `fetch`/redirect, no new OAuth library needed.
- `src/app/api/stitch/callback/route.ts` (new, GET) — exchanges the returned `code` for tokens at `https://oauth2.googleapis.com/token`, then calls `saveSettings({ stitch_refresh_token })` to persist it the same way every other secret is persisted.
- Add `stitch_refresh_token: string` to `SettingsForm` (`types.ts`) and to `DEFAULT_SETTINGS` in `store.ts` (4-spot pattern — no `.env.local` fallback needed since this one is only ever produced by the OAuth flow, not hand-set).
- Admin visits `/api/stitch/auth` once after deploying to Railway; after that the refresh token lives in `data/settings.json` and auto-refreshes.

### 2. Stitch MCP client
- `src/lib/stitch.ts` (new) — thin MCP client using `@modelcontextprotocol/sdk` (new dependency; nothing in the repo talks MCP today) over the server's HTTP/SSE transport.
  - `getAccessToken(refreshToken)`: POSTs to Google's token endpoint with the refresh token, returns a short-lived access token (no caching complexity needed — one call per redesign run).
  - `generateDesign({ screenshotUrl, prompt }): Promise<{ imageUrls: string[]; projectId: string }>`: opens an MCP client session authenticated with the access token, calls Stitch's design-generation tool in Experimental/Pro mode (per `WEBSITE_REDESIGN_PLAN.md:36`), returns image URLs + project id.

### 3. Programmatic prompt-writer (vision LLM call)
- `src/lib/redesign-prompt.ts` (new) — mirrors `planSearch` in `src/lib/openrouter.ts` exactly (same inline-fetch style, same `extractJson` helper, its own model constant): one OpenRouter chat-completions call using the multimodal content-array form (`[{type:"text",...},{type:"image_url",...}]`) so the screenshot is sent as vision input — `planSearch` today is text-only, this is the first vision call in the repo.
  - `writeRedesignPrompt(business, screenshotUrl, apiKey): Promise<{ brief: string; prompt: string }>` — sends the desktop screenshot + `business.name/category/short_description`, asks for what looks dated / current brand colors / tone, and returns one unique prompt string (never templated, per the skill's step 4).

### 4. Wire it into the existing route
- `src/app/api/redesign/route.ts`: after `captureScreenshots` succeeds, instead of stopping at `redesign_status: "pending"`, continue in the same request:
  1. `writeRedesignPrompt(business, desktopUrl, settings.openrouter_api_key)`
  2. `generateDesign({ screenshotUrl: desktopUrl, prompt })` from `src/lib/stitch.ts`, wrapped in a bounded retry (3 attempts, small backoff)
  3. `updateRedesignResult(place_id, { redesign_status: "done", redesign_prompt: prompt, redesign_image_urls: imageUrls, stitch_project_id: projectId, redesigned_at: ... })` — reuses the existing `store.ts` function directly (no HTTP round-trip to `/api/redesign/save`, which stays as-is for manual backfill/retry use).
  4. On failure after retries: `redesign_status: "failed"`, return the error — same shape the route already returns today.
- `src/components/business-card.tsx:45`: update the toast copy since the response now reflects the finished redesign, not just "screenshots captured" (e.g. "Redesign complete!" on success, keep existing error toast on failure). `isTriggering` already disables the button for the duration of the request — no new loading-state code needed, the request just takes longer now (screenshots + vision call + Stitch, roughly 20-90s).

### 5. Docs
- `WEBSITE_REDESIGN_PLAN.md:62`: update the "Stitch MCP is not connected to this project yet" line once wired.

## Verification

- Manual end-to-end: after setting the env vars and completing the one-time `/api/stitch/auth` consent on a Railway deploy, click "Redesign" on a business card with a website in the running app; confirm the response includes `redesign_image_urls` and `stitch_project_id`, and that `data/businesses.json` (or Mongo, if `mongodb_uri` is set) shows `redesign_status: "done"`.
- Failure path: temporarily point `STITCH_MCP_URL` at a bad URL, confirm the route retries 3 times then sets `redesign_status: "failed"` and the UI shows the error toast.
- Add one `test_*` or `assert`-based self-check for `writeRedesignPrompt`'s JSON-extraction path (reusing `extractJson`, same as any coverage `planSearch` already has, if any) — not a full test framework, just the smallest runnable check on the new parsing logic.
