import { NextRequest } from "next/server";
import { getBusinesses, updateRedesignResult, updateBusiness, getSettings } from "@/lib/store";
import { captureScreenshots } from "@/lib/screenshot-helper";
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

    // 1. Pre-flight checks for credentials
    if (!settings.openrouter_api_key) {
      return Response.json(
        { error: "OpenRouter API Key is missing. Please configure it in Settings." },
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

    // 3. Step A: Capture Screenshots
    let desktopUrl: string;
    let mobileUrl: string;
    try {
      const crawlResult = await captureScreenshots(business.website, place_id);
      desktopUrl = crawlResult.desktopUrl;
      mobileUrl = crawlResult.mobileUrl;
    } catch (crawlErr) {
      console.error("Redesign crawl failed:", crawlErr);
      await updateRedesignResult(place_id, { redesign_status: "failed" });
      return Response.json(
        { error: `Crawl/Screenshot failed: ${String(crawlErr)}` },
        { status: 500 }
      );
    }

    // 4. Step B: Vision LLM Prompt Writer
    console.log(`Analyzing screenshot and writing redesign prompt for: ${business.name}`);
    let brief = "";
    let uniquePrompt = "";
    let theme: RedesignPromptResult["theme"];
    try {
      const promptResult = await writeRedesignPrompt(
        business,
        desktopUrl,
        settings.openrouter_api_key
      );
      brief = promptResult.brief;
      uniquePrompt = promptResult.prompt;
      theme = promptResult.theme;
      console.log(`Generated prompt: "${uniquePrompt.substring(0, 100)}..."`);
    } catch (promptErr) {
      console.error("Vision prompt writing failed:", promptErr);
      await updateRedesignResult(place_id, { redesign_status: "failed" });
      return Response.json(
        { error: `Vision analysis/prompt writing failed: ${String(promptErr)}` },
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
      screenshots: { desktopUrl, mobileUrl },
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

