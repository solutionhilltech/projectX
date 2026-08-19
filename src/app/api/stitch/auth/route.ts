import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const client_id = process.env.STITCH_OAUTH_CLIENT_ID;
  const scopes = process.env.STITCH_OAUTH_SCOPES;

  if (!client_id || !scopes) {
    return NextResponse.json(
      { error: "STITCH_OAUTH_CLIENT_ID or STITCH_OAUTH_SCOPES environment variables are not configured." },
      { status: 500 }
    );
  }

  const origin = new URL(request.url).origin;
  const redirect_uri = `${origin}/api/stitch/callback`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", client_id);
  authUrl.searchParams.set("redirect_uri", redirect_uri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(authUrl.toString());
}
