export const runtime = "nodejs";
export const maxDuration = 60;

import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendPushToUser } from "../send/route";
import { buildNexusContext } from "@/lib/ai/nexusContext";
import Anthropic from "@anthropic-ai/sdk";
import { nextOccurrence } from "@/lib/schedule/recurrence";

const anthropic = new Anthropic();
const TZ = "America/New_York";

async function runScheduledTasks(admin: ReturnType<typeof createAdminClient>) {
  const now = new Date();
  await admin.from("nexus_scheduled_tasks").update({ status: "active", claimed_at: null })
    .eq("status", "running").lt("claimed_at", new Date(now.getTime() - 2 * 60 * 60_000).toISOString());
  const { data: dueTasks } = await admin.from("nexus_scheduled_tasks").select("id,user_id,name,prompt,recurrence,next_run_at")
    .eq("status", "active").lte("next_run_at", now.toISOString()).order("next_run_at").limit(50);
  let completed = 0;
  let failed = 0;
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(5, dueTasks?.length ?? 0) }, async () => {
    while (cursor < (dueTasks?.length ?? 0)) {
      const task = dueTasks![cursor++];
      const { data: claimed } = await admin.from("nexus_scheduled_tasks").update({ status: "running", claimed_at: now.toISOString(), last_error: "" })
        .eq("id", task.id).eq("status", "active").lte("next_run_at", now.toISOString()).select("id").maybeSingle();
      if (!claimed) continue;
      try {
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-6", max_tokens: 700,
          system: "Complete the scheduled reasoning task using only its prompt. You have no tools and cannot read or modify external systems. Be clear about uncertainty and return a useful result.",
          messages: [{ role: "user", content: task.prompt }],
        });
        const output = response.content[0]?.type === "text" ? response.content[0].text.slice(0, 12000) : "No output was returned.";
        const nextAt = nextOccurrence(task.next_run_at, task.recurrence, now);
        await admin.from("nexus_scheduled_tasks").update({
          status: nextAt ? "active" : "completed", next_run_at: nextAt,
          last_output: output, last_run_at: now.toISOString(), claimed_at: null,
        }).eq("id", task.id).eq("status", "running");
        completed += 1;
      } catch (error) {
        await admin.from("nexus_scheduled_tasks").update({ status: "failed", last_error: error instanceof Error ? error.message.slice(0, 500) : "Run failed", claimed_at: null })
          .eq("id", task.id).eq("status", "running");
        failed += 1;
      }
    }
  }));
  return { completed, failed };
}

export async function GET(req: NextRequest) {
  // Vercel cron passes Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const scheduled = await runScheduledTasks(admin);

  // Find all users with push subscriptions
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id")
    .limit(50);

  if (!subs?.length) return NextResponse.json({ sent: 0, scheduled });

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

  return NextResponse.json({ sent: totalSent, users: userIds.length, scheduled });
}
