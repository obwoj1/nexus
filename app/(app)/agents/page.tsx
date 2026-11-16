import { Network } from "lucide-react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/Topbar";
import { AgentStudio } from "@/components/agents/AgentStudio";

export default async function AgentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const [agentsResult, workflowsResult, projectsResult] = await Promise.all([
    admin.from("nexus_agent_profiles").select("id,name,specialty,instructions,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    admin.from("nexus_agent_workflows").select("id,name,instructions,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    admin.from("nexus_projects").select("id,name").eq("user_id", user.id).order("name"),
  ]);
  return <div className="flex flex-col flex-1">
    <Topbar section="ASSISTANT" title="Agent teams" />
    <main className="flex-1 p-5 md:p-8 max-w-6xl w-full">
      <div className="mb-7 flex items-start gap-4">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "rgba(200,144,10,.12)", color: "#E8B428" }}><Network className="w-5 h-5" /></div>
        <div><p className="text-[10px] tracking-[.22em] uppercase" style={{ color: "rgba(245,240,232,.4)" }}>NEXUS ASSISTANT</p><h1 className="text-2xl font-semibold mt-1">Specialists, working together</h1><p className="text-sm mt-1" style={{ color: "rgba(245,240,232,.5)" }}>Run a bounded reasoning team for a task, then review the synthesis and each perspective.</p></div>
      </div>
      <AgentStudio agents={agentsResult.data ?? []} workflows={workflowsResult.data ?? []} projects={projectsResult.data ?? []} availableProviders={["claude", ...(process.env.GEMINI_API_KEY ? ["gemini"] : [])]} loadError={Boolean(agentsResult.error || workflowsResult.error)} />
    </main>
  </div>;
}
