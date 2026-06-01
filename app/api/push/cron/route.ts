import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendPushToUser } from "../send/route";
import { buildNexusContext } from "@/lib/ai/nexusContext";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();
const TZ = "America/New_York";

export async function GET(req: NextRequest) {
  // Vercel cron passes Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Find all users with push subscriptions
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id")
    .limit(50);

  if (!subs?.length) return NextResponse.json({ sent: 0 });

  const userIds = [...new Set(subs.map((s) => s.user_id))];
  const today = new Date().toLocaleDateString("en-CA", { timeZone: TZ });

  let totalSent = 0;

  await Promise.all(userIds.map(async (userId) => {
    try {
      const context = await buildNexusContext(userId, today, TZ);

      const res = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 120,
        system: `You are Claudia Ainina, a personal AI. Generate a single-sentence morning notification (under 120 chars) that summarizes the most important thing from the user's day — a key event, habit to hit, or something urgent. No emojis. Direct and specific.`,
        messages: [{ role: "user", content: `Today is ${today} EST.\n\n${context}\n\nWrite the morning notification message only.` }],
      });

      const body = res.content[0].type === "text" ? res.content[0].text.trim() : "Check your Nexus dashboard for today's briefing.";

      const result = await sendPushToUser(userId, {
        title: "Good morning — Nexus",
        body,
        url: "/dashboard",
        tag: "morning-briefing",
      });
      totalSent += result.sent;
    } catch (e) {
      console.error("[push-cron] failed for user", userId, e);
    }
  }));

  return NextResponse.json({ sent: totalSent, users: userIds.length });
}
