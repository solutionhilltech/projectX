import type { Business } from "@/lib/types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : cleaned);
}

export interface RedesignPromptResult {
  brief: string;
  prompt: string;
}

/**
 * Calls OpenRouter with a vision payload (desktop screenshot + metadata) to analyze the site 
 * and generate a unique, non-templated Stitch redesign prompt.
 */
export async function writeRedesignPrompt(
  business: Business,
  screenshotUrl: string,
  apiKey: string
): Promise<RedesignPromptResult> {
  if (!apiKey) {
    throw new Error("OpenRouter API key is missing. Configure it in Settings.");
  }

  const systemInstructions = `You are an expert UI/UX design critic and prompt engineer.
Analyze the provided screenshot of the business's current website, along with their metadata:
- Name: "${business.name}"
- Category: "${business.category}"
- Short Description: "${business.short_description || 'None'}"

Perform two tasks:
1. Write a short, critical design "brief" (~2-3 sentences) explaining:
   - What looks dated or visually cluttered about the current site.
   - What brand colors/vibes we should keep.
   - What tone/aesthetic (e.g. premium cafe, rustic bakery, clinical dentistry) is appropriate.
2. Write one unique, tailored "prompt" (~1-2 paragraphs) for a UI generator called Stitch to redesign this website.
   - Describe a modern, mobile-friendly landing page layout.
   - Detail the colors, typography, spacing, and key sections (e.g. hero, booking, specials).
   - Incorporate concrete visual details from your analysis.
   - Do NOT use standard templates or generic descriptions. Customize it completely to this specific business's theme.

Respond with ONLY a JSON object (no markdown formatting, no explanations) containing these exact keys:
{
  "brief": "Your short design analysis here",
  "prompt": "Your unique Stitch redesign prompt here"
}`;

  console.log(`Calling OpenRouter vision LLM to write prompt for: ${business.name}`);

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: systemInstructions,
            },
            {
              type: "image_url",
              image_url: {
                url: screenshotUrl,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter vision call failed: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenRouter returned no response content.");
  }

  try {
    const parsed = extractJson(content) as Partial<RedesignPromptResult>;
    if (!parsed.brief || !parsed.prompt) {
      throw new Error("JSON structure did not contain both 'brief' and 'prompt' keys.");
    }
    return {
      brief: parsed.brief,
      prompt: parsed.prompt,
    };
  } catch (err) {
    console.error("Failed to parse OpenRouter vision output:", content);
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
