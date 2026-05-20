import { createClient } from "@/lib/supabase/server";
import { getTodayEvents } from "@/lib/google/calendar";
import { getInboxStats } from "@/lib/google/gmail";
import { Topbar } from "@/components/layout/Topbar";
import { DashboardWidgets } from "@/components/dashboard/DashboardWidgets";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [eventsResult, statsResult] = await Promise.allSettled([
    user ? getTodayEvents(user.id) : Promise.resolve([]),
    user ? getInboxStats(user.id) : Promise.resolve({ total: 0, unread: 0 }),
  ]);

  const todayEvents = eventsResult.status === "fulfilled" ? eventsResult.value : null;
  const inboxStats  = statsResult.status  === "fulfilled" ? statsResult.value  : null;
  const name = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? undefined;

  return (
    <div className="flex flex-col flex-1">
      <Topbar section="OVERVIEW" title="Dashboard" />
      <main className="flex-1 p-8">
        <DashboardWidgets name={name} todayEvents={todayEvents} inboxStats={inboxStats} />
      </main>
    </div>
  );
}
