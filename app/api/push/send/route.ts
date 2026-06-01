export const runtime = "nodejs";

import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendWebPush, type PushPayload } from "@/lib/webpush";

export type { PushPayload };

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs?.length) return { sent: 0 };

  let sent = 0;
  const stale: string[] = [];

  await Promise.all(subs.map(async (sub) => {
    try {
      const status = await sendWebPush(sub, payload);
      if (status === 201 || status === 200) sent++;
      else if (status === 410 || status === 404) stale.push(sub.endpoint);
    } catch { /* network error — skip */ }
  }));

  if (stale.length) {
    await admin.from("push_subscriptions").delete().in("endpoint", stale);
  }
  return { sent };
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { userId, payload } = await req.json() as { userId: string; payload: PushPayload };
  const result = await sendPushToUser(userId, payload);
  return NextResponse.json(result);
}
