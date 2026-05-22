"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

const anthropic = new Anthropic();

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function calcStreak(logDates: Set<string>, today: string): number {
  let streak = 0;
  const d = new Date(today);
  while (logDates.has(d.toISOString().split("T")[0])) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// Fetches all tracking data and formats it as a readable context block
async function buildContext(uid: string, today: string): Promise<string> {
  const admin = createAdminClient();

  const [habits, habitLogs, subscriptions, goals, reading, health, dates] = await Promise.all([
    admin.from("habits").select("*").eq("user_id", uid),
    admin.from("habit_logs").select("habit_id, date").eq("user_id", uid).gte("date", daysAgo(60)),
    admin.from("subscriptions").select("*").eq("user_id", uid),
    admin.from("goals").select("*").eq("user_id", uid),
    admin.from("reading_list").select("*").eq("user_id", uid),
    admin.from("health_metrics").select("*").eq("user_id", uid).gte("date", daysAgo(14)).order("date", { ascending: false }),
    admin.from("important_dates").select("*").eq("user_id", uid),
  ]);

  // ── Habits ───────────────────────────────────────────────────────────────
  const logs = habitLogs.data ?? [];
  const habitLines = (habits.data ?? []).map((h) => {
    const hLogs = logs.filter((l) => l.habit_id === h.id);
    const last30 = hLogs.filter((l) => l.date >= daysAgo(30));
    const rate = Math.round((last30.length / 30) * 100);
    const logSet = new Set(hLogs.map((l) => l.date));
    const streak = calcStreak(logSet, today);
    return `  - ${h.name}: ${rate}% completion (last 30d), streak: ${streak}d`;
  }).join("\n");

  // ── Subscriptions ────────────────────────────────────────────────────────
  const subs = subscriptions.data ?? [];
  const monthlyTotal = subs.reduce((sum, s) => {
    const f = s.billing_cycle === "annual" ? 1 / 12 : s.billing_cycle === "weekly" ? 4.33 : 1;
    return sum + Number(s.amount) * f;
  }, 0);
  const subLines = subs.map((s) => `  - ${s.name}: $${s.amount} ${s.billing_cycle}${s.category ? ` (${s.category})` : ""}`).join("\n");

  // ── Goals ────────────────────────────────────────────────────────────────
  const goalLines = (goals.data ?? []).map((g) => {
    const dLeft = g.target_date
      ? Math.ceil((new Date(g.target_date).getTime() - new Date(today).getTime()) / 86400000)
      : null;
    const deadline = dLeft === null ? "" : dLeft >= 0 ? `, ${dLeft}d left` : `, OVERDUE by ${Math.abs(dLeft)}d`;
    return `  - "${g.title}": ${g.progress}% [${g.status}]${deadline}`;
  }).join("\n");

  // ── Health ───────────────────────────────────────────────────────────────
  const healthLines = (health.data ?? []).map((h) =>
    `  - ${h.date}: sleep ${h.sleep_hours ?? "—"}h, water ${h.water_oz ?? "—"}oz, mood ${h.mood ?? "—"}/5${h.weight_lbs ? `, ${h.weight_lbs}lbs` : ""}`
  ).join("\n");

  const MOOD = ["", "😞", "😕", "😐", "🙂", "😄"];
  const hRows = health.data ?? [];
  const avgSleep = hRows.filter((r) => r.sleep_hours).length
    ? (hRows.reduce((s, r) => s + Number(r.sleep_hours ?? 0), 0) / hRows.filter((r) => r.sleep_hours).length).toFixed(1)
    : null;
  const avgMood = hRows.filter((r) => r.mood).length
    ? (hRows.reduce((s, r) => s + Number(r.mood ?? 0), 0) / hRows.filter((r) => r.mood).length).toFixed(1)
    : null;

  // ── Reading ──────────────────────────────────────────────────────────────
  const books = reading.data ?? [];
  const currentlyReading = books.filter((b) => b.status === "reading").map((b) => `"${b.title}"${b.author ? ` by ${b.author}` : ""}`).join(", ");

  // ── Dates ────────────────────────────────────────────────────────────────
  const dateLines = (dates.data ?? []).map((d) => {
    const days = Math.ceil((new Date(d.date + "T12:00:00").getTime() - new Date(today).getTime()) / 86400000);
    return `  - ${d.label} (${d.type}): ${days === 0 ? "TODAY" : days > 0 ? `${days}d away` : `${Math.abs(days)}d ago`}`;
  }).join("\n");

  return `
TODAY: ${today}

HABITS (last 30 days):
${habitLines || "  No habits tracked yet"}

SUBSCRIPTIONS (monthly burn: $${monthlyTotal.toFixed(2)}/mo = $${(monthlyTotal * 12).toFixed(2)}/yr):
${subLines || "  None tracked"}

GOALS:
${goalLines || "  No goals set"}

HEALTH (last 14 days):
  Avg sleep: ${avgSleep ?? "—"}h | Avg mood: ${avgMood ? `${avgMood}/5 ${MOOD[Math.round(Number(avgMood))]}` : "—"}
${healthLines || "  No entries yet"}

READING:
  Currently: ${currentlyReading || "nothing"}
  To read: ${books.filter((b) => b.status === "to-read").length} | Done: ${books.filter((b) => b.status === "done").length}

IMPORTANT DATES:
${dateLines || "  None added"}
`.trim();
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

export async function askClaudiaTrackingAction(
  messages: ChatMessage[],
  isGreeting = false
): Promise<{ result?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const cookieStore = await cookies();
    const tz = cookieStore.get("nexus-tz")?.value ?? "America/New_York";
    const today = new Date().toLocaleDateString("en-CA", { timeZone: tz });

    const context = await buildContext(user.id, today);
    const userName = user.user_metadata?.full_name?.split(" ")[0] ?? "there";

    const system = `You are Claudia Ainina — ${userName}'s personal AI, built into Nexus, their command center app. You have live access to their tracking data below. Be warm, direct, and specific. Reference actual numbers. Keep replies to 2–4 sentences unless asked for more. No bullet lists unless the user asks. Speak like a sharp personal coach, not a chatbot.

${context}`;

    const callMessages: ChatMessage[] = isGreeting
      ? [{ role: "user", content: `Give me a quick personalized check-in. Pick the one thing that stands out most in my data and mention it. End with one specific question.` }]
      : messages;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system,
      messages: callMessages,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return { result: text };
  } catch (e) {
    console.error("[askClaudiaTracking]", e);
    return { error: "Claudia is unavailable right now" };
  }
}
