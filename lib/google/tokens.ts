import { createAdminClient } from "@/lib/supabase/server";

export function buildSecondaryGoogleAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/secondary-callback`,
    response_type: "code",
    scope: [
      "email",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/calendar.readonly",
    ].join(" "),
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface GoogleRefreshResponse {
  access_token: string;
  expires_in: number;
  error?: string;
}

export async function getValidGoogleToken(userId: string): Promise<string> {
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("google_access_token, google_refresh_token, google_token_expires_at")
    .eq("user_id", userId)
    .single();

  if (!profile?.google_access_token) {
    throw new Error("NO_TOKEN");
  }

  const expiresAt = profile.google_token_expires_at
    ? new Date(profile.google_token_expires_at)
    : new Date(0);
  const stillValid = expiresAt.getTime() - 5 * 60 * 1000 > Date.now();

  if (stillValid) return profile.google_access_token;

  if (!profile.google_refresh_token) throw new Error("NO_REFRESH_TOKEN");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: profile.google_refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const json: GoogleRefreshResponse = await res.json();
  if (!res.ok || json.error) throw new Error("TOKEN_REFRESH_FAILED");

  const newExpiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString();

  await supabase
    .from("profiles")
    .update({ google_access_token: json.access_token, google_token_expires_at: newExpiresAt })
    .eq("user_id", userId);

  return json.access_token;
}

export async function getValidSecondaryGoogleToken(userId: string): Promise<string | null> {
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("secondary_google_access_token, secondary_google_refresh_token, secondary_google_token_expires_at")
    .eq("user_id", userId)
    .single();

  if (!profile?.secondary_google_access_token) return null;

  const expiresAt = profile.secondary_google_token_expires_at
    ? new Date(profile.secondary_google_token_expires_at)
    : new Date(0);
  const stillValid = expiresAt.getTime() - 5 * 60 * 1000 > Date.now();

  if (stillValid) return profile.secondary_google_access_token;

  if (!profile.secondary_google_refresh_token) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: profile.secondary_google_refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const json: GoogleRefreshResponse = await res.json();
  if (!res.ok || json.error) return null;

  const newExpiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString();
  await supabase
    .from("profiles")
    .update({ secondary_google_access_token: json.access_token, secondary_google_token_expires_at: newExpiresAt })
    .eq("user_id", userId);

  return json.access_token;
}
