# ProjectX — Scout → Redesign → WhatsApp

An internal agent dashboard that finds local businesses, generates a redesigned
website mockup for each one, and delivers it to the owner over WhatsApp.

The whole flow is three steps, each usable on its own from the dashboard:

| Step | What happens | Entry point |
| --- | --- | --- |
| **1. Scout** | An LLM turns a plain-English query ("cafes in Solan") into a search plan, runs it against a places provider, and saves the results. Streams progress to the UI over SSE. | `GET /api/search` |
| **2. Redesign** | Crawls the business's current site with Puppeteer, screenshots desktop + mobile, has a vision model write a bespoke design brief, then generates a new UI in Google Stitch. | `POST /api/redesign` |
| **3. Deliver** | Sends the finished mockup to the business's WhatsApp number via the Meta Cloud API. | `POST /api/whatsapp/send` |

Step 2 runs steps 2 and 3 together: a successful redesign auto-sends on WhatsApp.

## Requirements

- Node.js 22+ (24 recommended — the self-check scripts rely on native TypeScript stripping)
- A MongoDB database
- API keys as listed under [Configuration](#configuration)

## Quick start

```bash
npm install
cp .env.local.example .env.local   # then fill it in (see Configuration)

# Create the single operator login used by the sign-in page
node --env-file=.env.local scripts/seed-admin.mjs <username> <password>

npm run dev                        # http://localhost:3000
```

Sign in at `/login` with the credentials you just seeded. Everything except the
landing page and login is behind a session cookie (see `src/proxy.ts`).

## Configuration

Secrets live in `.env.local`. Most of them can also be set at runtime from the
dashboard's **Settings** view, which stores them in MongoDB; the environment
variable acts as the seed value until an override is saved.

### Required

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | HMAC key for signing session cookies. |
| `MONGODB_URI` | Connection string. Holds `businesses`, `settings` and `auth_users`. |
| `OPENROUTER_API_KEY` | Search planning and the vision model that writes redesign prompts. |

### Per-feature

| Variable | Needed for |
| --- | --- |
| `GOOGLE_PLACES_API_KEY` | The default `google` search provider. |
| `UPLOADTHING_TOKEN` | Hosting site screenshots — WhatsApp needs a publicly fetchable URL. |
| `STITCH_MCP_URL`, `STITCH_API_KEY` | Google Stitch design generation. If either is missing the redesign route runs in **mock mode** and returns placeholder images. |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Sending messages. Also `WHATSAPP_BUSINESS_ACCOUNT_ID` and `META_APP_ID` for template management. |
| `USE_SERVERLESS_CHROMIUM` | Set to `true` in Docker so Puppeteer uses the bundled headless Chromium instead of a full Chrome download. Auto-detected on Vercel. |
| `STITCH_OAUTH_CLIENT_ID`, `STITCH_OAUTH_CLIENT_SECRET`, `STITCH_OAUTH_SCOPES`, `GOOGLE_CLOUD_PROJECT` | Optional. Authenticate Stitch as a Google user instead of by API key, via the one-time flow at `/api/stitch/auth`. Unset by default. |

## Scripts

```bash
npm run dev      # Next dev server (Turbopack)
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint

# Self-checks (no test framework — see "Testing" below)
npx tsx scripts/test-csv.ts       # CSV export escaping
npx tsx scripts/test-parser.ts    # vision-output JSON parsing
node scripts/test-stitch.ts       # Stitch theme + screen filtering

# One-offs
node --env-file=.env.local scripts/seed-admin.mjs <username> <password>
node --env-file=.env.local scripts/submit-whatsapp-template.mjs
```

## Testing

There's no test framework. Non-trivial pure logic exposes a `runXSelfCheck()`
function next to the code it verifies, and `scripts/test-*.ts` runs it and exits
non-zero on failure. Keep that pattern rather than introducing a runner.

`test-stitch.ts` uses plain `node`, not `tsx` — it pulls in the ESM-only
`@google/stitch-sdk`, which tsx's CommonJS resolver cannot load.

## Project layout

```
src/
  app/
    api/           Route handlers (search, redesign, whatsapp, settings, auth, stitch OAuth)
    dashboard/     The signed-in app
    login/         Sign-in page
  components/      UI — dashboard, business grid/table, agent console, settings, toasts
  hooks/           use-agent-stream (SSE), use-business-actions (redesign/WhatsApp triggers)
  lib/
    store.ts           MongoDB access; the only data layer
    search-providers.ts  Pluggable place lookup (google, osm, maps scraper)
    openrouter.ts      LLM search planning
    screenshot-helper  Puppeteer crawl + UploadThing upload
    redesign-prompt.ts Vision model → design brief, Stitch prompt and theme tokens
    stitch.ts          Google Stitch design generation
    whatsapp.ts        Meta Cloud API delivery
  proxy.ts         Auth gate for every route
scripts/           Self-check runners and one-off admin tasks
```

## Deployment

**Railway / Docker** (`railway.json`, `Dockerfile`) is the primary target. The
image is multi-stage: Next builds in `standalone` mode and the runner ships only
traced files plus `@sparticuz/chromium`, whose Brotli-compressed browser is
inflated to `/tmp` at startup. Health check: `GET /api/status`.

**Vercel** works, with one caveat: the redesign route declares
`maxDuration = 300`, and a full run takes roughly 2–3 minutes. Your plan must
actually allow that ceiling — on a plan capped below it, the function is killed
mid-generation. Long crawl-plus-generate work is a better fit for Railway.

## Notes

- Redesign runs are slow by nature (crawl → vision model → design generation).
  The UI keeps the trigger button disabled for the duration; there is no job queue.
- Google Stitch is an experimental Google Labs product. Its API is occasionally
  flaky — `create_project` is retried, and generation is polled rather than
  retried, per Google's own guidance. See `CLAUDE.md` for the details.
