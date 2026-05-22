import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Topbar } from "@/components/layout/Topbar";
import { TrackingShell } from "@/components/tracking/TrackingShell";

export default async function TrackingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const uid = user.id;

  // Today's date in user timezone
  const cookieStore = await cookies();
  const tz = cookieStore.get("nexus-tz")?.value ?? "America/New_York";
  const today = new Date().toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD

  // Parallel data fetch for all sections
  const [
    { data: habits },
    { data: habitLogs },
    { data: subscriptions },
    { data: goals },
    { data: reading },
    { data: healthRows },
    { data: dates },
  ] = await Promise.all([
    admin.from("habits").select("*").eq("user_id", uid).order("created_at"),
    // Last 60 days of logs — enough for streak calculation + 7-day view
    admin.from("habit_logs").select("habit_id, date").eq("user_id", uid)
      .gte("date", new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
    admin.from("subscriptions").select("*").eq("user_id", uid).order("created_at"),
    admin.from("goals").select("*").eq("user_id", uid).order("created_at"),
    admin.from("reading_list").select("*").eq("user_id", uid).order("created_at"),
    // Last 7 days of health data
    admin.from("health_metrics").select("*").eq("user_id", uid)
      .gte("date", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
      .order("date", { ascending: false }),
    admin.from("important_dates").select("*").eq("user_id", uid).order("date"),
  ]);

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden">
      <Topbar section="TRACKING" title="Tracking" />
      <TrackingShell
        today={today}
        habits={habits ?? []}
        habitLogs={habitLogs ?? []}
        subscriptions={subscriptions ?? []}
        goals={goals ?? []}
        reading={reading ?? []}
        healthRows={healthRows ?? []}
        dates={dates ?? []}
      />
    </div>
  );
}
