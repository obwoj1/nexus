export const runtime = "nodejs";

import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

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
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      );
      sent++;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 410 || statusCode === 404) stale.push(sub.endpoint);
    }
  }));

  if (stale.length) {
    await admin.from("push_subscriptions").delete().in("endpoint", stale);
  }
  return { sent };
}

// Manual send endpoint (internal use)
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { userId, payload } = await req.json() as { userId: string; payload: PushPayload };
  const result = await sendPushToUser(userId, payload);
  return NextResponse.json(result);
}
