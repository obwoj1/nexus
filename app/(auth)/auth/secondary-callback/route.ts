import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  error?: string;
}

interface GoogleUserInfo {
  email?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${origin}/mail?secondary_error=access_denied`);
  }

  // Verify the user is still logged in as their primary account
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Exchange authorization code with Google directly (not Supabase Auth)
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/secondary-callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokenData: GoogleTokenResponse = await tokenRes.json();
  if (!tokenRes.ok || tokenData.error) {
    return NextResponse.redirect(`${origin}/mail?secondary_error=token_failed`);
  }

  // Fetch the email address of the secondary account
  const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userInfo: GoogleUserInfo = userInfoRes.ok ? await userInfoRes.json() : {};

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({
      secondary_google_email: userInfo.email ?? null,
      secondary_google_access_token: tokenData.access_token,
      secondary_google_token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      ...(tokenData.refresh_token && {
        secondary_google_refresh_token: tokenData.refresh_token,
      }),
    })
    .eq("user_id", user.id);

  return NextResponse.redirect(`${origin}/mail?secondary_connected=1`);
}
