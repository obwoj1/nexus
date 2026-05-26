import { createAdminClient } from "@/lib/supabase/server";
import { getValidGoogleToken } from "@/lib/google/tokens";

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

export async function buildNexusContext(userId: string, today: string, tz: string): Promise<string> {
  const admin = createAdminClient();

  const [
    habits, habitLogs, subscriptions, goals, reading, health, dates,
    holdings, sessions, notes,
  ] = await Promise.all([
    admin.from("habits").select("*").eq("user_id", userId),
    admin.from("habit_logs").select("habit_id, date").eq("user_id", userId).gte("date", daysAgo(60)),
    admin.from("subscriptions").select("*").eq("user_id", userId),
    admin.from("goals").select("*").eq("user_id", userId),
    admin.from("reading_list").select("*").eq("user_id", userId),
    admin.from("health_metrics").select("*").eq("user_id", userId).gte("date", daysAgo(14)).order("date", { ascending: false }),
    admin.from("important_dates").select("*").eq("user_id", userId),
    admin.from("holdings").select("ticker, name, asset_type, quantity, cost_basis").eq("user_id", userId),
    admin.from("workout_sessions").select("id, name, started_at, duration_minutes").eq("user_id", userId).order("started_at", { ascending: false }).limit(10),
    admin.from("notes").select("title, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(8),
  ]);

  // ── Habits ───────────────────────────────────────────────────────────────
  const logs = habitLogs.data ?? [];
  const habitLines = (habits.data ?? []).map((h) => {
    const hLogs = logs.filter((l) => l.habit_id === h.id);
    const last30 = hLogs.filter((l) => l.date >= daysAgo(30));
    const rate = Math.round((last30.length / 30) * 100);
    const streak = calcStreak(new Set(hLogs.map((l) => l.date)), today);
    return `  - ${h.name}: ${rate}% (30d), streak ${streak}d`;
  }).join("\n") || "  None";

  // ── Subscriptions ────────────────────────────────────────────────────────
  const subs = subscriptions.data ?? [];
  const monthlyBurn = subs.reduce((s, sub) => {
    const f = sub.billing_cycle === "annual" ? 1 / 12 : sub.billing_cycle === "weekly" ? 4.33 : 1;
    return s + Number(sub.amount) * f;
  }, 0);
  const subLines = subs.map((s) => `  - ${s.name} $${s.amount}/${s.billing_cycle}`).join("\n") || "  None";

  // ── Goals ────────────────────────────────────────────────────────────────
  const goalLines = (goals.data ?? []).map((g) => {
    const dLeft = g.target_date
      ? Math.ceil((new Date(g.target_date).getTime() - new Date(today).getTime()) / 86400000)
      : null;
    const dl = dLeft === null ? "" : dLeft >= 0 ? `, ${dLeft}d left` : `, OVERDUE ${Math.abs(dLeft)}d`;
    return `  - "${g.title}" ${g.progress}% [${g.status}]${dl}`;
  }).join("\n") || "  None";

  // ── Health ───────────────────────────────────────────────────────────────
  const hRows = health.data ?? [];
  const avgSleep = hRows.filter((r) => r.sleep_hours).length
    ? (hRows.reduce((s, r) => s + Number(r.sleep_hours ?? 0), 0) / hRows.filter((r) => r.sleep_hours).length).toFixed(1)
    : "—";
  const avgMood = hRows.filter((r) => r.mood).length
    ? (hRows.reduce((s, r) => s + Number(r.mood ?? 0), 0) / hRows.filter((r) => r.mood).length).toFixed(1)
    : "—";
  const latestHealth = hRows[0];
  const latestLine = latestHealth
    ? `Latest (${latestHealth.date}): sleep ${latestHealth.sleep_hours ?? "—"}h, mood ${latestHealth.mood ?? "—"}/5, water ${latestHealth.water_oz ?? "—"}oz`
    : "No recent entries";

  // ── Reading ──────────────────────────────────────────────────────────────
  const books = reading.data ?? [];
  const currentRead = books.filter((b) => b.status === "reading").map((b) => `"${b.title}"`).join(", ") || "nothing";

  // ── Important dates ──────────────────────────────────────────────────────
  const dateLines = (dates.data ?? []).map((d) => {
    const days = Math.ceil((new Date(d.date + "T12:00:00").getTime() - new Date(today).getTime()) / 86400000);
    const when = days === 0 ? "TODAY" : days > 0 ? `in ${days}d` : `${Math.abs(days)}d ago`;
    return `  - ${d.label} (${d.type}): ${when}`;
  }).join("\n") || "  None";

  // ── Investments ──────────────────────────────────────────────────────────
  const holdingList = holdings.data ?? [];
  const holdingLines = holdingList.map((h) =>
    `  - ${h.ticker} (${h.asset_type}): ${h.quantity} shares @ $${Number(h.cost_basis).toFixed(2)} avg cost`
  ).join("\n") || "  No holdings";

  // ── Workouts ─────────────────────────────────────────────────────────────
  const workoutList = sessions.data ?? [];
  const lastWorkout = workoutList[0];
  const lastWorkoutLine = lastWorkout
    ? `Last session: "${lastWorkout.name}" ${new Date(lastWorkout.started_at).toLocaleDateString("en-US", { timeZone: tz, month: "short", day: "numeric" })}${lastWorkout.duration_minutes ? ` (${lastWorkout.duration_minutes}min)` : ""}`
    : "No sessions logged";
  const recentWorkouts = workoutList.slice(0, 5).map((s) =>
    `  - ${s.name} — ${new Date(s.started_at).toLocaleDateString("en-US", { timeZone: tz, month: "short", day: "numeric" })}`
  ).join("\n") || "  None";

  // ── Notes ────────────────────────────────────────────────────────────────
  const noteLines = (notes.data ?? []).map((n) =>
    `  - "${n.title}" (updated ${new Date(n.updated_at).toLocaleDateString("en-US", { timeZone: tz, month: "short", day: "numeric" })})`
  ).join("\n") || "  None";

  // ── Calendar (best-effort — may not have token) ───────────────────────────
  let calendarSection = "  Not available";
  try {
    const token = await getValidGoogleToken(userId);
    const now = new Date().toISOString();
    const endOfWeek = new Date(Date.now() + 7 * 86400000).toISOString();
    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${endOfWeek}&singleEvents=true&orderBy=startTime&maxResults=10`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (calRes.ok) {
      const calData = await calRes.json() as {
        items?: Array<{ summary?: string; start?: { dateTime?: string; date?: string } }>;
      };
      const events = (calData.items ?? []).map((e) => {
        const start = e.start?.dateTime ?? e.start?.date ?? "";
        const when = start
          ? new Date(start).toLocaleDateString("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
          : "";
        return `  - ${e.summary ?? "Untitled"} — ${when}`;
      }).join("\n");
      calendarSection = events || "  No events in the next 7 days";
    }
  } catch { /* no Google token — skip */ }

  return `
TODAY: ${today} | TIMEZONE: ${tz}

HABITS:
${habitLines}

SUBSCRIPTIONS ($${monthlyBurn.toFixed(0)}/mo burn):
${subLines}

GOALS:
${goalLines}

HEALTH (14-day avg — sleep: ${avgSleep}h, mood: ${avgMood}/5):
  ${latestLine}

READING: Currently ${currentRead} | To-read: ${books.filter((b) => b.status === "to-read").length} | Done: ${books.filter((b) => b.status === "done").length}

IMPORTANT DATES:
${dateLines}

INVESTMENTS (${holdingList.length} holdings):
${holdingLines}

WORKOUTS:
  ${lastWorkoutLine}
${recentWorkouts}

RECENT NOTES:
${noteLines}

CALENDAR (next 7 days):
${calendarSection}
`.trim();
}
