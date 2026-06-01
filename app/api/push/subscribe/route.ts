export const runtime = "nodejs";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const { endpoint, keys } = body.data;
  const admin = createAdminClient();
  await admin.from("push_subscriptions").upsert(
    { user_id: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    { onConflict: "user_id, endpoint" }
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint } = await req.json() as { endpoint?: string };
  if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

  const admin = createAdminClient();
  await admin.from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
  return NextResponse.json({ ok: true });
}
