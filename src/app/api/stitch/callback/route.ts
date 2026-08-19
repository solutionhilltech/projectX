import { NextRequest, NextResponse } from "next/server";
import { saveSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.json({ error: `OAuth Error: ${error}` }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code." }, { status: 400 });
  }

  const client_id = process.env.STITCH_OAUTH_CLIENT_ID;
  const client_secret = process.env.STITCH_OAUTH_CLIENT_SECRET;

  if (!client_id || !client_secret) {
    return NextResponse.json(
      { error: "STITCH_OAUTH_CLIENT_ID or STITCH_OAUTH_CLIENT_SECRET not configured." },
      { status: 500 }
    );
  }

  const origin = new URL(request.url).origin;
  const redirect_uri = `${origin}/api/stitch/callback`;

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id,
        client_secret,
        redirect_uri,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `Token exchange failed: ${errorText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const refreshToken = data.refresh_token;

    if (!refreshToken) {
      return NextResponse.json(
        {
          error: "No refresh token returned. If you have already authenticated before, you must revoke app permissions in your Google account settings first or re-run with force consent.",
        },
        { status: 400 }
      );
    }

    // Persist the refresh token in the configuration
    await saveSettings({ stitch_refresh_token: refreshToken });

    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #000000; color: #ffffff; letter-spacing: -0.01em; }
            .card { text-align: center; padding: 2.5rem; border-radius: 18px; background: #1d1d1f; max-w: 400px; }
            h1 { color: #ffffff; margin-top: 0; font-weight: 600; letter-spacing: -0.02em; }
            p { font-size: 14px; line-height: 1.6; color: #cccccc; }
            .close-btn { margin-top: 1.5rem; display: inline-block; padding: 11px 22px; background: #0066cc; color: #ffffff; font-weight: 400; text-decoration: none; border-radius: 9999px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Success!</h1>
            <p>Google OAuth connection completed successfully. The Stitch refresh token has been persisted to settings.</p>
            <p>You can close this tab and return to the Project X Scout Agent dashboard.</p>
          </div>
        </body>
      </html>`,
      {
        headers: { "Content-Type": "text/html" },
      }
    );
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error during token exchange" },
      { status: 500 }
    );
  }
}
