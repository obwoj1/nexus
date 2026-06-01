import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

interface MSTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  error?: string;
}

interface MSUserInfo {
  mail?: string;
  userPrincipalName?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${origin}/calendar?outlook_error=access_denied`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      code,
      redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/auth/outlook-callback`,
      grant_type:    "authorization_code",
      scope:         "offline_access https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/User.Read",
    }),
  });

  const tokenData: MSTokenResponse = await tokenRes.json();
  if (!tokenRes.ok || tokenData.error) {
    return NextResponse.redirect(`${origin}/calendar?outlook_error=token_failed`);
  }

  // Get the Outlook email
  const userRes = await fetch("https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userInfo: MSUserInfo = userRes.ok ? await userRes.json() : {};
  const outlookEmail = userInfo.mail ?? userInfo.userPrincipalName ?? null;

  const admin = createAdminClient();
  await admin.from("profiles").update({
    outlook_email:            outlookEmail,
    outlook_access_token:     tokenData.access_token,
    outlook_token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    ...(tokenData.refresh_token && { outlook_refresh_token: tokenData.refresh_token }),
  }).eq("user_id", user.id);

  return NextResponse.redirect(`${origin}/calendar?outlook_connected=1`);
}
