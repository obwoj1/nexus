import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").upsert({
          user_id: user.id,
          full_name: user.user_metadata.full_name ?? user.user_metadata.name ?? null,
          avatar_url: user.user_metadata.avatar_url ?? null,
        }, { onConflict: "user_id" });
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Exchange failed — send back to login with an error hint
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
