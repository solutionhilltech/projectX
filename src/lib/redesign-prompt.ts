import type { Business } from "@/lib/types";
import type { StitchTheme } from "@/lib/stitch";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Groq is the preferred provider when GROQ_API_KEY is set: same OpenAI-shaped
// API, ~2.5s for this call versus 10-20s on OpenRouter's free tier, and it
// honours response_format reliably. Note Groq serves no general Llama chat
// model — its meta-llama entries are prompt-guard classifiers.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
// Text-only since the vision step was dropped, so free models are plenty.
// Named explicitly rather than using `openrouter/free`: that router can land on
// a content-safety classifier, which answers "User Safety: safe" instead of the
// JSON we asked for. OpenRouter walks this list in order, which also covers the
// 429s individual free models return when busy.
// Set OPENROUTER_MODEL to pin one model (or a paid one) instead.
// OpenRouter rejects more than three entries in `models`.
const FREE_MODELS = [
  "z-ai/glm-5.2:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
];
const PINNED_MODEL = process.env.OPENROUTER_MODEL;

function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : cleaned);
}

export interface RedesignPromptResult {
  brief: string;
  prompt: string;
  /** Raw model-chosen theme tokens; normalised against Stitch's enums in stitch.ts. */
  theme?: Partial<StitchTheme>;
}

/**
 * Writes a unique, non-templated Stitch redesign prompt from the business's
 * metadata plus whatever we could scrape off their current site.
 *
 * Text-only on purpose: this used to send a screenshot to a vision model, which
 * cost far more tokens and required running headless Chromium just to produce
 * the image. Scraped copy actually describes their services and products better
 * than a screenshot did.
 */
export async function writeRedesignPrompt(
  business: Business,
  siteContent: string,
  apiKey: string
): Promise<RedesignPromptResult> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey && !apiKey) {
    throw new Error("No prompt-writing model configured. Set GROQ_API_KEY, or add an OpenRouter API key in Settings.");
  }

  // Instagram-as-website, SPA shells and dead domains all scrape to nothing —
  // say so explicitly rather than leaving a confusing empty section.
  const siteSection = siteContent
    ? `Here is the content scraped from their current website. Use their real services, products and wording:\n${siteContent}`
    : `Their current website could not be read (it may be a social page or require JavaScript). Work from the metadata above alone and do not invent specific products or prices.`;

  const systemInstructions = `You are an expert UI/UX design critic and prompt engineer.
A local business needs its website redesigned. Their details:
- Name: "${business.name}"
- Category: "${business.category}"
- Short Description: "${business.short_description || 'None'}"

${siteSection}

Perform two tasks:
1. Write a short "brief" (~2-3 sentences) explaining:
   - What this business actually offers, based on the content above.
   - What brand colors/vibes suit them.
   - What tone/aesthetic (e.g. premium cafe, rustic bakery, clinical dentistry) is appropriate.
2. Write one unique, tailored "prompt" (~1-2 paragraphs) for a UI generator called Stitch to redesign this website.
   - Describe a modern, mobile-friendly landing page layout.
   - Detail the colors, typography, spacing, and key sections (e.g. hero, booking, specials).
   - Name their real services, products or specialities from the scraped content wherever you can — that specificity is the whole point.
   - Spell out exact colors, layout and imagery in words.
   - Do NOT use standard templates or generic descriptions. Customize it completely to this specific business's theme.
   - Stitch sees only this text — never write "the provided image", "as shown above", or any reference to something it cannot see, or the generation fails.

3. Pick the design-system theme tokens that suit this business. Choose ONLY from these exact values:
   - colorMode: "LIGHT" or "DARK"
   - headlineFont / bodyFont: INTER, MANROPE, PLUS_JAKARTA_SANS, SPACE_GROTESK, WORK_SANS, DM_SANS,
     SORA, OUTFIT, LEXEND, RUBIK, KARLA, EPILOGUE, GEIST, SYNE, MONTSERRAT, RALEWAY, QUICKSAND,
     COMFORTAA, OSWALD, BEBAS_NEUE, ANTON, PLAYFAIR_DISPLAY, EB_GARAMOND, LIBRE_CASLON_TEXT,
     MERRIWEATHER, NOTO_SERIF
   - roundness: "ROUND_TWO", "ROUND_FOUR", "ROUND_EIGHT", "ROUND_TWELVE" or "ROUND_FULL"
   - customColor: the brand's primary colour as a 6-digit hex string, e.g. "#8B4513"

Respond with ONLY a JSON object (no markdown formatting, no explanations) containing these exact keys:
{
  "brief": "Your short design analysis here",
  "prompt": "Your unique Stitch redesign prompt here",
  "theme": {
    "colorMode": "LIGHT",
    "headlineFont": "PLAYFAIR_DISPLAY",
    "bodyFont": "INTER",
    "roundness": "ROUND_TWELVE",
    "customColor": "#8B4513"
  }
}`;

  const provider = groqKey ? "Groq" : "OpenRouter";
  console.log(`Calling ${provider} to write redesign prompt for: ${business.name}`);

  const res = await fetch(groqKey ? GROQ_URL : OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqKey ?? apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: groqKey ? GROQ_MODEL : PINNED_MODEL ?? FREE_MODELS[0],
      // OpenRouter falls through this list when a model is busy or errors.
      ...(groqKey || PINNED_MODEL ? {} : { models: FREE_MODELS }),
      // Free models include reasoning ones that spend output tokens thinking
      // before answering; too low a cap truncates the JSON mid-string.
      max_tokens: 2000,
      // Ask for JSON mode explicitly — instructions alone are not enough, some
      // models reply with prose regardless.
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: systemInstructions,
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${provider} call failed: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error(`${provider} returned no response content.`);
  }

  try {
    const parsed = extractJson(content) as Partial<RedesignPromptResult>;
    if (!parsed.brief || !parsed.prompt) {
      throw new Error("JSON structure did not contain both 'brief' and 'prompt' keys.");
    }
    return {
      brief: parsed.brief,
      prompt: parsed.prompt,
      theme: parsed.theme,
    };
  } catch (err) {
    console.error(`Failed to parse ${provider} output:`, content);
    throw new Error(`Failed to extract structured design prompt: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Runs a local self-check to verify that JSON extraction handles markdown blocks correctly.
 * Useful for automated/runtime test assertions.
 */
export function runPromptParserSelfCheck(): boolean {
  const sampleOutputs = [
    `\`\`\`json\n{\n  "brief": "Dated layout.",\n  "prompt": "Create new design."\n}\n\`\`\``,
    `{\n  "brief": "Dated layout.",\n  "prompt": "Create new design."\n}`,
  ];

  for (const sample of sampleOutputs) {
    try {
      const parsed = extractJson(sample) as any;
      if (parsed.brief !== "Dated layout." || parsed.prompt !== "Create new design.") {
        return false;
      }
    } catch {
      return false;
    }
  }
  return true;
}
