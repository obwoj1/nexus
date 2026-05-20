import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      const { session } = data;
      const user = session.user;
      if (user) {
        await supabase.from("profiles").upsert({
          user_id: user.id,
          full_name: user.user_metadata.full_name ?? user.user_metadata.name ?? null,
          avatar_url: user.user_metadata.avatar_url ?? null,
          ...(session.provider_token && {
            google_access_token: session.provider_token,
            google_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          }),
          ...(session.provider_refresh_token && {
            google_refresh_token: session.provider_refresh_token,
          }),
        }, { onConflict: "user_id" });
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
