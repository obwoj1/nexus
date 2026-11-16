import { Clock4 } from "lucide-react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/Topbar";
import { ScheduleStudio } from "@/components/agents/ScheduleStudio";

export default async function SchedulePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await createAdminClient().from("nexus_scheduled_tasks")
    .select("id,name,prompt,recurrence,next_run_at,status,last_output,last_error,last_run_at,created_at")
    .eq("user_id", user.id).order("next_run_at", { ascending: true, nullsFirst: false }).limit(100);
  return <div className="flex flex-col flex-1">
    <Topbar section="ASSISTANT" title="Schedule" />
    <main className="flex-1 p-5 md:p-8 max-w-6xl w-full">
      <div className="mb-7 flex items-start gap-4">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "rgba(200,144,10,.12)", color: "#E8B428" }}><Clock4 className="w-5 h-5" /></div>
        <div><p className="text-[10px] tracking-[.22em] uppercase" style={{ color: "rgba(245,240,232,.4)" }}>AUTOMATION</p><h1 className="text-2xl font-semibold mt-1">Scheduled tasks</h1><p className="text-sm mt-1" style={{ color: "rgba(245,240,232,.5)" }}>Schedule a prompt for Nexus to run and save a response. No external tools or accounts are accessed.</p></div>
      </div>
      <ScheduleStudio tasks={data ?? []} loadError={Boolean(error)} />
    </main>
  </div>;
}
