import { NextRequest } from "next/server";
import { getBusinesses, updateRedesignResult, updateBusiness, getSettings } from "@/lib/store";
import { scrapeSite, describeSite } from "@/lib/site-scraper";
import { writeRedesignPrompt, type RedesignPromptResult } from "@/lib/redesign-prompt";
import { generateDesign } from "@/lib/stitch";
import { sendRedesignReadyMessage } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // puppeteer needs Node APIs, not Edge
// Crawl + vision LLM + Stitch (with retries) routinely runs well past
// Vercel's default timeout. Raise to your plan's actual cap in the Vercel
// dashboard/project settings — this is a floor, not a guarantee.
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  let businessId = "";
  try {
    const body = await request.json();
    const { place_id } = body;

    if (!place_id) {
      return Response.json({ error: "Missing place_id" }, { status: 400 });
    }

    businessId = place_id;

    const businesses = await getBusinesses();
    const business = businesses.find((b) => b.place_id === place_id);

    if (!business) {
      return Response.json({ error: "Business not found" }, { status: 404 });
    }

    if (!business.website) {
      return Response.json(
        { error: "Business does not have a website to redesign" },
        { status: 400 }
      );
    }

    const settings = await getSettings();

    // 1. Pre-flight checks for credentials. Either provider can write the
    // prompt, so only complain when neither is configured.
    if (!process.env.GROQ_API_KEY && !settings.openrouter_api_key) {
      return Response.json(
        { error: "No prompt-writing model configured. Set GROQ_API_KEY, or add an OpenRouter API Key in Settings." },
        { status: 400 }
      );
    }

    const useMockMode = !process.env.STITCH_MCP_URL || !process.env.STITCH_API_KEY;
    if (useMockMode) {
      console.warn("STITCH_MCP_URL or STITCH_API_KEY missing. Running in MOCK Mode.");
    }

    // 2. Mark status as in_progress
    console.log(`Starting redesign crawl for: ${business.name} (${place_id})`);
    await updateRedesignResult(place_id, {
      redesign_status: "in_progress",
      redesigned_at: new Date().toISOString(),
    });

    // 3. Step A: Scrape the current site for their real services and products.
    // Best-effort by design — a social-media "website" or a JS-only page yields
    // nothing readable, and the prompt writer falls back to metadata alone
    // rather than failing the whole redesign.
    console.log(`Scraping current site for: ${business.name} (${business.website})`);
    const site = await scrapeSite(business.website);
    const siteContent = describeSite(site);
    if (!site.isUseful) {
      console.warn(`No readable content scraped from ${business.website}; using metadata only.`);
    }

    // 4. Step B: LLM Prompt Writer
    console.log(`Writing redesign prompt for: ${business.name}`);
    let brief = "";
    let uniquePrompt = "";
    let theme: RedesignPromptResult["theme"];
    try {
      const promptResult = await writeRedesignPrompt(
        business,
        siteContent,
        settings.openrouter_api_key
      );
      brief = promptResult.brief;
      uniquePrompt = promptResult.prompt;
      theme = promptResult.theme;
      console.log(`Generated prompt: "${uniquePrompt.substring(0, 100)}..."`);
    } catch (promptErr) {
      console.error("Redesign prompt writing failed:", promptErr);
      await updateRedesignResult(place_id, { redesign_status: "failed" });
      return Response.json(
        { error: `Prompt writing failed: ${String(promptErr)}` },
        { status: 500 }
      );
    }

    // 5. Step C: Generate Design in Stitch (single attempt — Stitch's tool docs
    // say DO NOT RETRY; generateDesign polls for the result internally instead)
    console.log(`Calling Stitch MCP client for design generation...`);
    let imageUrls: string[] = [];
    let projectId = "";
    try {
      if (useMockMode) {
        // Run in mock mode to bypass Stitch MCP dependency
        projectId = "mock-stitch-project-" + Math.floor(Math.random() * 100000);
        imageUrls = [
          "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=600",
          "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600"
        ];
        console.log(`[MOCK MODE] Project generated: ${projectId}`);
      } else {
        const designResult = await generateDesign({
          businessName: business.name,
          prompt: uniquePrompt,
          theme,
          refreshToken: settings.stitch_refresh_token || undefined,
        });
        imageUrls = designResult.imageUrls;
        projectId = designResult.projectId;
        console.log(`Stitch generation successful! Project ID: ${projectId}, Screens: ${imageUrls.length}`);
      }
    } catch (stitchErr) {
      console.error("Stitch redesign generation failed:", stitchErr);
      await updateRedesignResult(place_id, { redesign_status: "failed" });
      return Response.json(
        { error: "Stitch couldn't generate a design right now. Please try again in a bit." },
        { status: 500 }
      );
    }

    // 6. Step D: Persist final success results
    await updateRedesignResult(place_id, {
      redesign_status: "done",
      redesign_prompt: uniquePrompt,
      redesign_image_urls: imageUrls,
      stitch_project_id: projectId,
      redesigned_at: new Date().toISOString(),
    });

    // 7. Step E: Auto-send the redesign to the business's WhatsApp number
    let whatsapp: { ok: boolean; messageIds: string[]; error?: string };
    try {
      whatsapp = await sendRedesignReadyMessage({ ...business, redesign_image_urls: imageUrls }, settings);
    } catch (waErr) {
      whatsapp = { ok: false, messageIds: [], error: waErr instanceof Error ? waErr.message : String(waErr) };
    }
    await updateBusiness(place_id, {
      whatsapp_status: whatsapp.ok ? "sent" : "failed",
      whatsapp_message_ids: whatsapp.messageIds,
      whatsapp_error: whatsapp.error,
      whatsapp_sent_at: whatsapp.ok ? new Date().toISOString() : undefined,
    });
    if (!whatsapp.ok) {
      console.warn(`WhatsApp send failed for ${business.name}: ${whatsapp.error}`);
    }

    return Response.json({
      success: true,
      message: "Redesign complete!",
      brief,
      scrapedSite: { usable: site.isUseful, title: site.title, colors: site.colors },
      redesign: { imageUrls, projectId },
      whatsapp,
    });

  } catch (err) {
    console.error("Redesign endpoint error:", err);
    if (businessId) {
      await updateRedesignResult(businessId, { redesign_status: "failed" });
    }
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

