import { createAdminClient } from "@/lib/supabase/server";

interface MSTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  error?: string;
}

export function buildOutlookAuthUrl(): string {
  const params = new URLSearchParams({
    client_id:     process.env.MICROSOFT_CLIENT_ID!,
    response_type: "code",
    redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/auth/outlook-callback`,
    scope:         "offline_access https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/User.Read",
    response_mode: "query",
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function getValidOutlookToken(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("outlook_access_token, outlook_refresh_token, outlook_token_expires_at")
    .eq("user_id", userId)
    .single();

  if (!profile?.outlook_access_token) return null;

  const expiresAt = profile.outlook_token_expires_at
    ? new Date(profile.outlook_token_expires_at)
    : new Date(0);
  const stillValid = expiresAt.getTime() - 5 * 60 * 1000 > Date.now();
  if (stillValid) return profile.outlook_access_token;

  if (!profile.outlook_refresh_token) return null;

  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: profile.outlook_refresh_token,
      grant_type:    "refresh_token",
      scope:         "offline_access https://graph.microsoft.com/Calendars.Read https://graph.microsoft.com/User.Read",
    }),
  });

  const json: MSTokenResponse = await res.json();
  if (!res.ok || json.error) return null;

  const newExpiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString();
  await admin.from("profiles").update({
    outlook_access_token: json.access_token,
    outlook_token_expires_at: newExpiresAt,
    ...(json.refresh_token && { outlook_refresh_token: json.refresh_token }),
  }).eq("user_id", userId);

  return json.access_token;
}
