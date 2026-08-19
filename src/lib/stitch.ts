import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/** Connects to Stitch MCP, creates a project, generates the redesign, and returns images. */
export async function generateDesign(params: {
  businessName: string;
  prompt: string;
}): Promise<{ imageUrls: string[]; projectId: string }> {
  const mcpUrl = process.env.STITCH_MCP_URL;
  const apiKey = process.env.STITCH_API_KEY;
  if (!mcpUrl || !apiKey) {
    throw new Error("STITCH_MCP_URL or STITCH_API_KEY environment variables are not configured.");
  }

  const transport = new StreamableHTTPClientTransport(new URL(mcpUrl), {
    requestInit: {
      headers: {
        Accept: "application/json",
        "X-Goog-Api-Key": apiKey,
      },
    },
  });

  const client = new Client(
    { name: "scout-stitch-client", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);

  try {
    console.log(`Creating project in Stitch for: ${params.businessName}`);
    const createResult = (await client.callTool({
      name: "create_project",
      arguments: {
        title: `${params.businessName} Redesign`,
      },
    })) as any;

    let projectData: any = {};
    if (createResult.content && createResult.content[0] && createResult.content[0].type === "text") {
      projectData = JSON.parse(createResult.content[0].text);
    } else {
      projectData = createResult;
    }

    const projectName = projectData.name || "";
    const projectId = projectName.split("/").pop();

    if (!projectId) {
      throw new Error(`Failed to retrieve project ID from create_project response: ${JSON.stringify(createResult)}`);
    }

    console.log(`Stitch project created successfully. Project ID: ${projectId}. Generating MOBILE screen...`);

    const generateResult = (await client.callTool({
      name: "generate_screen_from_text",
      arguments: {
        projectId,
        prompt: params.prompt,
        deviceType: "MOBILE",
        modelId: "GEMINI_3_1_PRO",
      },
    }, undefined, { timeout: 180_000 })) as any;

    let generateData: any = {};
    if (generateResult.content && generateResult.content[0] && generateResult.content[0].type === "text") {
      generateData = JSON.parse(generateResult.content[0].text);
    } else {
      generateData = generateResult;
    }

    const designComponent = (generateData?.outputComponents || []).find((c: any) => c.design);
    const screens = designComponent?.design?.screens || [];
    const imageUrls: string[] = [];
    for (const s of screens) {
      if (s.screenshot?.downloadUrl) {
        // Bare downloadUrl serves a ~20KB thumbnail. Requesting the screen's
        // own design-point size as a Google image-serving bounding box gets
        // the full-resolution render. Do NOT multiply by 2: for tall
        // full-page mobile designs (e.g. 780x8636) that pushes the request
        // past lh3.googleusercontent.com's pixel budget, which then 400s
        // with an HTML error page instead of an image — and WhatsApp fails
        // to download it (Meta error 131053 "Media upload error").
        const w = Number(s.width) || 0;
        const h = Number(s.height) || 0;
        const sizeSuffix = w && h ? `=w${w}-h${h}` : "";
        imageUrls.push(s.screenshot.downloadUrl + sizeSuffix);
      }
    }

    if (imageUrls.length === 0) {
      throw new Error(`Stitch did not generate any preview screens. Output: ${JSON.stringify(generateResult)}`);
    }

    return {
      imageUrls,
      projectId,
    };
  } finally {
    try {
      await client.close();
    } catch (e) {
      // Ignore client close errors
      console.warn("Client close warning:", e);
    }
  }
}
